import { describe, expect, it } from 'vitest'
import { ALIYUN_MPV_PLAYBACK_HEADERS, hasPlaybackHeaders, mergeMpvPlaybackHeaders, mergePlaybackHeaders, shouldProxyMpvPlayback } from '../playbackHeaders'

describe('playback header contract', () => {
  it('does not let an empty quality header object hide provider authentication', () => {
    expect(mergePlaybackHeaders({ Authorization: 'Bearer provider-token' }, {})).toEqual({
      Authorization: 'Bearer provider-token'
    })
  })

  it('preserves the complete cloud download request contract', () => {
    expect(mergePlaybackHeaders({
      Authorization: 'Bearer token',
      Cookie: 'sid=quark',
      'User-Agent': 'BoxPlayer',
      Referer: 'https://pan.example/',
      Origin: 'https://pan.example',
      'x-urlp': 'signed-value'
    })).toEqual({
      Authorization: 'Bearer token',
      Cookie: 'sid=quark',
      'User-Agent': 'BoxPlayer',
      Referer: 'https://pan.example/',
      Origin: 'https://pan.example',
      'x-urlp': 'signed-value'
    })
  })

  it('overrides duplicate names case-insensitively with quality-specific values', () => {
    expect(mergePlaybackHeaders(
      { authorization: 'Bearer shared', Referer: 'https://shared.example/' },
      { Authorization: 'Bearer quality', referer: 'https://quality.example/' }
    )).toEqual({
      Authorization: 'Bearer quality',
      referer: 'https://quality.example/'
    })
  })

  it('drops blank entries and reports whether usable headers remain', () => {
    expect(mergePlaybackHeaders({ Authorization: '', Cookie: '  ' })).toBeUndefined()
    expect(hasPlaybackHeaders({ Authorization: '', Cookie: '  ' })).toBe(false)
    expect(hasPlaybackHeaders({ Authorization: 'Bearer token' })).toBe(true)
  })

  it('adds the renderer interceptor headers explicitly for native Aliyun playback', () => {
    expect(mergeMpvPlaybackHeaders('aliyun')).toEqual(ALIYUN_MPV_PLAYBACK_HEADERS)
    expect(mergeMpvPlaybackHeaders('quark')).toBeUndefined()
  })

  it('passes 139 signed CDN headers directly to MPV instead of using the local proxy', () => {
    const headers = { 'User-Agent': 'BoxPlayer', Referer: 'https://yun.139.com/', Origin: 'https://yun.139.com' }

    expect(shouldProxyMpvPlayback('139', headers)).toBe(false)
    expect(shouldProxyMpvPlayback('quark', headers)).toBe(true)
    expect(shouldProxyMpvPlayback('139', headers, true)).toBe(false)
  })
})
