using UnityEngine;

namespace Nightfall.Data
{
    /// <summary>
    /// A hunter class (Occultist / Sentinel / Medium / Alchemist).
    /// Generated from NightfallCatalog.
    /// </summary>
    [CreateAssetMenu(menuName = "Nightfall/Loadout Class", fileName = "Loadout")]
    public class LoadoutClassSO : ScriptableObject
    {
        public LoadoutClass Id;
        public string DisplayName;

        [Tooltip("Evidence scan radius in meters")]
        public float ScanRadius = 2.4f;
        [Tooltip("Cost in funds to place one ward")]
        public int WardCost = 50;

        public GearId[] DefaultGear;

        [Header("Cross-references (filled by generator)")]
        public GearItemSO[] DefaultGearRefs;
    }
}
