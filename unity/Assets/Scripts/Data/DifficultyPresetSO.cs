using UnityEngine;

namespace Nightfall.Data
{
    /// <summary>
    /// A difficulty preset (Amateur -> Nightmare). Generated from
    /// NightfallCatalog.
    /// </summary>
    [CreateAssetMenu(menuName = "Nightfall/Difficulty Preset", fileName = "Difficulty")]
    public class DifficultyPresetSO : ScriptableObject
    {
        public DifficultyId Id;
        public string DisplayName;

        public int StartingFunds;
        [Tooltip("Moon meter climb per hunt tick")]
        public float MoonRate;
        [Tooltip("Fear meter climb per hunt tick")]
        public float FearRate;
        [Tooltip("Threat % at which the vampire starts pursuing")]
        public int VampireThreshold;
        public int GearSlots;
        public int EvidenceRequired;
        public float RewardMultiplier = 1f;
        [Tooltip("Nightmare only: clue spots draw 3-of-4 from signature + tell")]
        public bool AllowAltEvidence;
    }
}
