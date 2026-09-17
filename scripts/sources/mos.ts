import { enumerateMosFamilies, isDegenerate, modesOfFamily } from '../../src/core/mos.ts'
import { brightnessOf } from '../../src/core/scale.ts'
import type { ScaleContribution, ScaleSource } from './types.ts'

/** exhaustive moment-of-symmetry enumeration for 24edo. */
export const mosSource: ScaleSource = {
  id: 'mos',
  describe: () => 'exhaustive 24edo moment-of-symmetry enumeration',
  collect() {
    const out: ScaleContribution[] = []
    for (const family of enumerateMosFamilies(2, 12)) {
      const modes = modesOfFamily(family)
      // brightest mode first, the way xen references list them
      const ranked = [...modes].sort((a, b) => brightnessOf(b.shape) - brightnessOf(a.shape))
      ranked.forEach((mode, rank) => {
        const tags = ['mos', `${family.n}-note`]
        if (isDegenerate(family)) tags.push('degenerate')
        if (family.periods > 1) tags.push('multi-period')
        if (mode.shape.degrees.every((d) => d % 2 === 0)) tags.push('12edo')
        else tags.push('quarter-tone')
        out.push({
          key: mode.shape.key,
          names: [`${family.name} mode ${rank + 1}`],
          family: family.name,
          tags,
          meta: {
            notes: family.n,
            large: family.large,
            small: family.small,
            periods: family.periods,
            brightness: rank + 1,
          },
        })
      })
    }
    return out
  },
}
