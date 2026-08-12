// Suspect-narrowing logic, ported from the web build's journal + banish
// validation (server/index.js: vampireMatches / match:banish-prompt).
// Pure C# — no UnityEngine — usable from gameplay, UI, and headless server.

using System.Collections.Generic;
using System.Linq;

namespace Nightfall
{
    public static class DeductionEngine
    {
        /// <summary>
        /// True when every confirmed evidence fits inside this species'
        /// pool (canonical 3, plus the alt tell when allowAlt is set).
        /// </summary>
        public static bool Matches(VampireDef species, IReadOnlyCollection<EvidenceId> confirmed, bool allowAlt)
        {
            var pool = new HashSet<EvidenceId>(NightfallCatalog.FullPool(species, allowAlt));
            return confirmed.All(pool.Contains);
        }

        /// <summary>
        /// All species still consistent with the confirmed evidence.
        /// With 0 confirmed, that's the whole catalog; each confirmed sign
        /// narrows the list. Signatures are unique, so 3 canonical signs
        /// always pin exactly one species (outside Nightmare's alt draw).
        /// </summary>
        public static List<VampireDef> RemainingSuspects(IReadOnlyCollection<EvidenceId> confirmed, bool allowAlt)
        {
            return NightfallCatalog.Vampires
                .Where(v => Matches(v, confirmed, allowAlt))
                .ToList();
        }

        /// <summary>
        /// True when the confirmed evidence pins the species uniquely.
        /// </summary>
        public static bool IsUniquelyIdentified(IReadOnlyCollection<EvidenceId> confirmed, bool allowAlt, out VampireDef species)
        {
            var remaining = RemainingSuspects(confirmed, allowAlt);
            species = remaining.Count == 1 ? remaining[0] : null;
            return remaining.Count == 1;
        }

        /// <summary>
        /// Validates a banish pick the same way the server does:
        /// the pick must be consistent with the confirmed evidence
        /// (an inconsistent pick is rejected outright, not failed).
        /// </summary>
        public static bool IsPickConsistent(VampireId pick, IReadOnlyCollection<EvidenceId> confirmed, bool allowAlt)
        {
            return Matches(NightfallCatalog.GetVampire(pick), confirmed, allowAlt);
        }
    }
}
