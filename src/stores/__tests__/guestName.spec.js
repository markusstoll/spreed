import { setGuestNickname } from '@nextcloud/auth'
import { t } from '@nextcloud/l10n'
/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { createPinia, setActivePinia } from 'pinia'
import { setGuestUserName } from '../../services/participantsService.js'
import vuexStore from '../../store/index.js'
import { generateOCSErrorResponse } from '../../test-helpers.js'
import { useGuestNameStore } from '../guestName.js'

jest.mock('../../services/participantsService', () => ({
	setGuestUserName: jest.fn(),
}))
jest.mock('@nextcloud/auth', () => ({
	...jest.requireActual('@nextcloud/auth'),
	setGuestNickname: jest.fn(),
}))

describe('guestNameStore', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useGuestNameStore()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('sets guest name if empty', () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-one',
		}

		// Act
		store.addGuestName(actor1, { noUpdate: true })

		// Assert
		expect(store.getGuestName('token-1', 'actor-id1')).toBe('actor-display-name-one')
		// non-existing token
		expect(store.getGuestName('token-2', 'actor-id1')).toBe('Guest')
		// non-existing actorId
		expect(store.getGuestName('token-1', 'actor-id2')).toBe('Guest')
	})

	test('does not overwrite guest name if not empty', () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-one',
		}
		const actor1Altered = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-another',
		}

		// Act
		store.addGuestName(actor1, { noUpdate: true })
		// attempt overwriting
		store.addGuestName(actor1Altered, { noUpdate: true })

		// Assert
		expect(store.getGuestName('token-1', 'actor-id1')).toBe('actor-display-name-one')
	})

	test('forces overwriting guest name', () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-one',
		}
		const actor1Altered = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-another',
		}

		// Act
		store.addGuestName(actor1, { noUpdate: false })
		// attempt overwriting
		store.addGuestName(actor1Altered, { noUpdate: false })

		// Assert
		expect(store.getGuestName('token-1', 'actor-id1')).toBe('actor-display-name-another')
	})

	test('clear guest name', () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-one',
		}

		const actor1Altered = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: '',
		}

		// Act
		store.addGuestName(actor1, { noUpdate: true })
		store.addGuestName(actor1Altered, { noUpdate: false })

		// Assert
		expect(store.getGuestName('token-1', 'actor-id1')).toBe('Guest')
	})

	test('gets suffix with guest display name', () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor-display-name-one',
		}

		store.addGuestName(actor1, { noUpdate: false })

		// Assert
		expect(store.getGuestNameWithGuestSuffix('token-1', 'actor-id1')).toBe('actor-display-name-one (guest)')
	})

	test('does not get suffix for translatable default guest name', () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: t('spreed', 'Guest'),
		}

		store.addGuestName(actor1, { noUpdate: false })

		// Assert
		expect(store.getGuestNameWithGuestSuffix('token-1', 'actor-id1')).toBe('Guest')
	})

	test('stores the display name when guest submits it', async () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: t('spreed', 'Guest'),
		}

		vuexStore.dispatch('setCurrentUser', { uid: 'actor-id1' })

		const newName = 'actor 1'

		// Mock implementation of setGuestUserName
		setGuestUserName.mockResolvedValue()

		// Act
		await store.submitGuestUsername(actor1.token, newName)

		// Assert
		expect(setGuestUserName).toHaveBeenCalledWith(actor1.token, newName)
		expect(setGuestNickname).toHaveBeenCalledWith(newName)
		expect(store.getGuestName('token-1', 'actor-id1')).toBe('actor 1')
		expect(vuexStore.getters.getDisplayName()).toBe('actor 1')
	})

	test('removes display name from local storage when user sumbits an empty new name', async () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'actor 1',
		}
		const newName = ''

		vuexStore.dispatch('setCurrentUser', { uid: 'actor-id1' })

		// Mock implementation of setGuestUserName
		setGuestUserName.mockResolvedValue()

		// Act
		await store.submitGuestUsername(actor1.token, newName)

		// Assert
		expect(setGuestUserName).toHaveBeenCalledWith(actor1.token, newName)
		expect(setGuestNickname).toHaveBeenCalledWith('Guest')
	})

	test('resets to previous display name if there is an error in setting the new one', async () => {
		// Arrange
		const actor1 = {
			token: 'token-1',
			actorId: 'actor-id1',
			actorDisplayName: 'old actor 1',
		}
		console.error = jest.fn()

		vuexStore.dispatch('setCurrentUser', { uid: 'actor-id1' })
		store.addGuestName(actor1, { noUpdate: false })

		const newName = 'actor 1'

		// Mock implementation of setGuestUserName
		const error = generateOCSErrorResponse({ payload: {}, status: 400 })
		setGuestUserName.mockRejectedValue(error)

		// Act
		await store.submitGuestUsername(actor1.token, newName)

		// Assert
		expect(setGuestUserName).toHaveBeenCalledWith(actor1.token, newName)
		expect(vuexStore.getters.getDisplayName()).toBe(actor1.actorDisplayName)
	})
})
