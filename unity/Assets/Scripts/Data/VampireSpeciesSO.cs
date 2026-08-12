using UnityEngine;

namespace Nightfall.Data
{
    /// <summary>
    /// One of the 10 vampire species: evidence signature, Nightmare tell,
    /// lore, and the machine-checkable banishment ritual. Generated from
    /// NightfallCatalog.
    /// </summary>
    [CreateAssetMenu(menuName = "Nightfall/Vampire Species", fileName = "Vampire")]
    public class VampireSpeciesSO : ScriptableObject
    {
        public VampireId Id;
        public string DisplayName;

        [Header("Evidence signature")]
        public EvidenceId[] Evidence = new EvidenceId[3];
        public EvidenceId AltEvidence;      // Nightmare-only 4th tell

        [Header("Journal text")]
        [TextArea] public string Profile;
        [TextArea(4, 12)] public string Lore;
        [TextArea] public string Banishment;

        [Header("Banishment ritual — conditions checked at seal time")]
        public string RitualName;
        [TextArea] public string RitualHint;
        public string[] RitualRequirements;

        public bool RequiresFlashlightOff;
        public bool RequiresRelic;
        public bool RequiresMoonPulse;
        public int MoonPulsePeriod = 25;
        public int MoonPulseWindow = 4;
        public int MinWardsNearCrypt;
        public int WardNearCryptRadius = 2;
        public bool RequiresWardOnCrypt;
        public float StillSeconds;
        public int MinHuntersOnCrypt;
        public bool RequiresAllHuntersOnCrypt;
        public float MaxThreatPercent = -1f;
        public bool RequiresZeroWards;

        [Header("Cross-references (filled by generator)")]
        public EvidenceTypeSO[] EvidenceRefs;
        public EvidenceTypeSO AltEvidenceRef;

        [Header("Presentation (assign by hand)")]
        public GameObject ModelPrefab;      // the species' rigged model
        public AudioClip PresenceLoop;      // distant drone while hunting
        public AudioClip HuntScream;
    }
}
