import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  GetUserProfileUseCase,
  UpdateUserNameUseCase,
  UpdateUserStatusUseCase,
} from '../application/user-use-cases'

const profile = {
  user: {
    id: 'user-123',
    name: 'Test User',
    image: 'https://cdn.example.com/avatars/user-123/avatar',
    dominantColor: null,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
  },
  organization: {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    logo: 'https://s3.bucket.com/logos/logo.jpg',
  },
}

const users = {
  updateUserName: mock(() => Promise.resolve()),
  getUserProfile: mock(() => Promise.resolve(profile)),
}

const statusNotifier = {
  notifyStatusUpdated: mock(() => undefined),
}

describe('User use cases', () => {
  beforeEach(() => {
    users.updateUserName.mockClear()
    users.getUserProfile.mockClear()
    statusNotifier.notifyStatusUpdated.mockClear()
  })

  it('updates the user name through the repository port', async () => {
    await expect(
      new UpdateUserNameUseCase(users).execute({ userId: 'user-123', name: 'Ada' })
    ).resolves.toEqual({ name: 'Ada' })

    expect(users.updateUserName).toHaveBeenCalledWith('user-123', 'Ada')
  })

  it('loads a profile through the repository port', async () => {
    await expect(new GetUserProfileUseCase(users).execute({ userId: 'user-123' })).resolves.toEqual(
      profile
    )

    expect(users.getUserProfile).toHaveBeenCalledWith('user-123')
  })

  it('notifies status updates through the notifier port', async () => {
    await expect(
      new UpdateUserStatusUseCase(statusNotifier).execute({
        userId: 'user-123',
        status: 'busy',
      })
    ).resolves.toEqual({ status: 'busy' })

    expect(statusNotifier.notifyStatusUpdated).toHaveBeenCalledWith('user-123', 'busy')
  })
})
