// Gameplay constants shared with the web build (server/index.js + client).
// Keep these in sync when tuning either side.

namespace Nightfall
{
    public static class NightfallConstants
    {
        /// <summary>World size of one contract-map tile, in meters.</summary>
        public const float TileSize = 4.0f;

        /// <summary>Wall / ceiling height per floor, in meters.</summary>
        public const float FloorHeight = 3.4f;

        /// <summary>Camera eye height, in meters.</summary>
        public const float PlayerEyeHeight = 1.7f;

        /// <summary>Collision radius used by the web build's server.</summary>
        public const float PlayerRadius = 0.55f;

        public const float WalkSpeed = 3.4f;
        public const float SprintSpeed = 6.5f;

        /// <summary>Investigation mode movement multiplier.</summary>
        public const float InvestigateSpeedMultiplier = 0.5f;

        /// <summary>Server hunt tick, in seconds.</summary>
        public const float HuntTickSeconds = 1.5f;

        /// <summary>Seconds the player must hold still for stillness rituals.</summary>
        public const float RitualStillSeconds = 3.0f;

        /// <summary>Auto-pickup range for the relic, in meters.</summary>
        public const float RelicPickupRange = 1.5f;

        /// <summary>Starting fear / moon meters (percent).</summary>
        public const float StartFear = 18f;
        public const float StartMoon = 45f;

        /// <summary>Evidence payout per confirmed sign, before difficulty multiplier.</summary>
        public const int EvidencePayPerSign = 120;

        /// <summary>Funds awarded when a sign is logged mid-match.</summary>
        public const int FundsPerEvidence = 90;
    }
}
