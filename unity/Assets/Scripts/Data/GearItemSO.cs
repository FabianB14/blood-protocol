using UnityEngine;

namespace Nightfall.Data
{
    /// <summary>
    /// A hunter tool. Each detects exactly one evidence type — the core
    /// loadout tension of the deduction game. Generated from NightfallCatalog.
    /// </summary>
    [CreateAssetMenu(menuName = "Nightfall/Gear Item", fileName = "Gear")]
    public class GearItemSO : ScriptableObject
    {
        public GearId Id;
        public string DisplayName;
        public EvidenceId Detects;
        [TextArea] public string Tag;

        [Header("Cross-references (filled by generator)")]
        public EvidenceTypeSO DetectsEvidence;

        [Header("Presentation (assign by hand)")]
        public Sprite Icon;
        public GameObject HeldPrefab;   // first-person model when equipped
        public AudioClip ScanSound;
    }
}
