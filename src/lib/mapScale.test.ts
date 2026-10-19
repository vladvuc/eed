import { describe, expect, it } from 'vitest'
import { deltaE } from './color'
import { mapScale, niceCeil } from './mapScale'

describe('map colour scale', () => {
  it('rounds domain ends up to round numbers', () => {
    expect([0.3, 1, 3.2, 4.9, 7, 24, 130].map(niceCeil)).toEqual([0.3, 1, 4, 5, 8, 25, 150])
  })

  it('growth is diverging and symmetric around zero, ignoring a single outlier', () => {
    const values = [-28.8, -1, 0.5, 1, 1.5, 2, 2.2, 2.5, 3, 3.1, 3.4, 3.5, 3.7, 3.9, 4, 4.2, 4.4, 4.6, 4.8, 5.3]
    const s = mapScale('NGDP_RPCH', false, values, 'dark')
    expect(s.kind).toBe('diverging')
    expect(s.domain).toEqual([-6, 6])
    expect(s.colorOf(0)).toBe('#383835')
    // beyond the end: same colour as the end
    expect(s.colorOf(-28.8)).toBe(s.colorOf(-6))
    expect(s.position(0)).toBe(0.5)
  })

  it('debt ratios use one sequential hue; debt in euros is positioned on a log scale', () => {
    const ratio = mapScale('GGXWDG_NGDP', false, [20, 45, 60, 80, 110, 150], 'light')
    expect(ratio.kind).toBe('sequential')
    expect(ratio.domain).toEqual([0, 150])
    expect(deltaE(ratio.colorOf(0), ratio.colorOf(150))).toBeGreaterThan(30)

    const eur = mapScale('GGXWDG_EUR', true, [5e3, 4e4, 3e5, 2.6e6], 'dark')
    expect(eur.log).toBe(true)
    expect(eur.domain).toEqual([1e3, 1e7])
    expect(eur.position(1e5)).toBeCloseTo(0.5)
  })

  it('inflation with deflation keeps a rounded negative end', () => {
    const s = mapScale('PCPIPCH', false, [-0.7, 1.2, 2.5, 3, 4], 'dark')
    expect(s.domain).toEqual([-0.8, 4])
    expect(s.ticks).toEqual([-0.8, 0, 4])
  })
})
