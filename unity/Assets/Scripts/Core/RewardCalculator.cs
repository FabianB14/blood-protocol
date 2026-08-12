// Payout / rank math, ported 1:1 from server/index.js calculateRewards().
// Pure C# — no UnityEngine.

using System;

namespace Nightfall
{
    [Serializable]
    public struct RewardBreakdown
    {
        public bool Success;
        public int EvidencePay;
        public int SurvivalBonus;
        public int SpeedBonus;
        public int LevelBonus;
        public float RewardMultiplier;
        public int Total;
        public string Rank; // S / A / B / C / D
    }

    public static class RewardCalculator
    {
        /// <summary>
        /// Mirrors the web server exactly:
        ///   evidencePay   = round(evidenceCount * 120 * mult)
        ///   survivalBonus = success ? round(max(0, 250 - fear) * mult) : 0
        ///   speedBonus    = success ? round(max(0, 200 - moon) * mult) : 0
        ///   levelBonus    = success ? round(level * 80 * mult)         : 0
        ///   total         = round(funds + all bonuses)
        ///   rank: S >= 1800, A >= 1400, B >= 1050, C >= 750, else D
        /// </summary>
        public static RewardBreakdown Calculate(
            float funds,
            int evidenceCount,
            float fearPercent,
            float moonPercent,
            int contractLevel,
            float rewardMultiplier,
            bool success)
        {
            float mult = rewardMultiplier <= 0f ? 1f : rewardMultiplier;

            int evidencePay = (int)Math.Round(evidenceCount * NightfallConstants.EvidencePayPerSign * mult);
            int survivalBonus = success ? (int)Math.Round(Math.Max(0f, 250f - fearPercent) * mult) : 0;
            int speedBonus = success ? (int)Math.Round(Math.Max(0f, 200f - moonPercent) * mult) : 0;
            int levelBonus = success ? (int)Math.Round(contractLevel * 80 * mult) : 0;
            int total = (int)Math.Round(funds + evidencePay + survivalBonus + speedBonus + levelBonus);

            return new RewardBreakdown
            {
                Success = success,
                EvidencePay = evidencePay,
                SurvivalBonus = survivalBonus,
                SpeedBonus = speedBonus,
                LevelBonus = levelBonus,
                RewardMultiplier = mult,
                Total = total,
                Rank = RankFor(total)
            };
        }

        public static string RankFor(int total)
        {
            if (total >= 1800) return "S";
            if (total >= 1400) return "A";
            if (total >= 1050) return "B";
            if (total >= 750) return "C";
            return "D";
        }

        /// <summary>
        /// XP curve from the web build: level = floor(sqrt(xp / 50)) + 1.
        /// </summary>
        public static int LevelFromXp(int xp)
        {
            return (int)Math.Floor(Math.Sqrt(Math.Max(0, xp) / 50.0)) + 1;
        }

        /// <summary>
        /// XP gained per match, from the web build's finishMatch():
        /// floor(total / 5) + (success ? 60 : 10).
        /// </summary>
        public static int XpGained(int total, bool success)
        {
            return (int)Math.Floor(total / 5.0) + (success ? 60 : 10);
        }
    }
}
