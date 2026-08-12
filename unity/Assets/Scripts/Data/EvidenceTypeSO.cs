using UnityEngine;

namespace Nightfall.Data
{
    /// <summary>
    /// One of the 10 canonical evidence types. Generated from
    /// NightfallCatalog by Nightfall -> Generate Game Data.
    /// </summary>
    [CreateAssetMenu(menuName = "Nightfall/Evidence Type", fileName = "Evidence")]
    public class EvidenceTypeSO : ScriptableObject
    {
        public EvidenceId Id;
        public string DisplayName;
        [TextArea] public string Description;

        [Header("Presentation (assign by hand)")]
        public Sprite Icon;
        public Color JournalColor = Color.white;
    }
}
