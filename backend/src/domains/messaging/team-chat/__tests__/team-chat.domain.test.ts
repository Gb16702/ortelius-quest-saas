import { describe, expect, it } from 'bun:test'
import {
  buildMemberJoinedNotification,
  buildMemberLeftNotification,
  buildRequestSharedNotification,
  buildSettingChangeNotification,
} from '../domain'

describe('Team chat domain messages', () => {
  it('builds setting change notifications', () => {
    expect(
      buildSettingChangeNotification({
        organizationId: 'org-1',
        actorId: 'user-1',
        actorName: 'Ada',
        settingName: 'quotes',
        enabled: true,
      })
    ).toEqual({
      organizationId: 'org-1',
      actorId: 'user-1',
      content: 'Ada enabled quotes',
      metadata: { type: 'setting_change', setting: 'quotes', enabled: true },
    })
  })

  it('builds member and request notifications', () => {
    expect(
      buildMemberJoinedNotification({ organizationId: 'org-1', userId: 'u1', userName: 'Ada' })
    ).toMatchObject({ content: 'Ada joined the team', metadata: { type: 'member_joined' } })
    expect(
      buildMemberLeftNotification({ organizationId: 'org-1', userId: 'u1', userName: 'Ada' })
    ).toMatchObject({ content: 'Ada left the organization', metadata: { type: 'member_left' } })
    expect(
      buildRequestSharedNotification({
        organizationId: 'org-1',
        actorId: 'u1',
        actorName: 'Ada',
        requestId: 'req-1',
        requestNumber: 'R-1',
      })
    ).toMatchObject({
      content: 'Ada shared a request',
      metadata: { type: 'request_shared', requestId: 'req-1', requestNumber: 'R-1' },
    })
  })
})
