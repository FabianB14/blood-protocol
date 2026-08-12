// Nightfall -> Generate Game Data
//
// Materializes every entry in NightfallCatalog as a ScriptableObject asset
// under Assets/Data/. Idempotent: re-running updates existing assets in
// place (references held by scenes/prefabs stay valid). Finishes with a
// validation pass over the whole dataset.

using System.Collections.Generic;
using System.IO;
using System.Linq;
using Nightfall.Data;
using UnityEditor;
using UnityEngine;

namespace Nightfall.EditorTools
{
    public static class NightfallDataGenerator
    {
        private const string Root = "Assets/Data";

        [MenuItem("Nightfall/Generate Game Data")]
        public static void Generate()
        {
            EnsureFolder(Root);
            EnsureFolder(Root + "/Evidence");
            EnsureFolder(Root + "/Gear");
            EnsureFolder(Root + "/Vampires");
            EnsureFolder(Root + "/Difficulties");
            EnsureFolder(Root + "/Loadouts");
            EnsureFolder(Root + "/Contracts");

            // ---- Evidence (first: everything else references it) ----
            var evidenceAssets = new Dictionary<EvidenceId, EvidenceTypeSO>();
            foreach (var def in NightfallCatalog.Evidence)
            {
                var asset = LoadOrCreate<EvidenceTypeSO>($"{Root}/Evidence/{def.Id}.asset");
                asset.Id = def.Id;
                asset.DisplayName = def.DisplayName;
                asset.Description = def.Description;
                EditorUtility.SetDirty(asset);
                evidenceAssets[def.Id] = asset;
            }

            // ---- Gear ----
            var gearAssets = new Dictionary<GearId, GearItemSO>();
            foreach (var def in NightfallCatalog.Gear)
            {
                var asset = LoadOrCreate<GearItemSO>($"{Root}/Gear/{def.Id}.asset");
                asset.Id = def.Id;
                asset.DisplayName = def.DisplayName;
                asset.Detects = def.Detects;
                asset.Tag = def.Tag;
                asset.DetectsEvidence = evidenceAssets[def.Detects];
                EditorUtility.SetDirty(asset);
                gearAssets[def.Id] = asset;
            }

            // ---- Vampires ----
            foreach (var def in NightfallCatalog.Vampires)
            {
                var asset = LoadOrCreate<VampireSpeciesSO>($"{Root}/Vampires/{def.Id}.asset");
                asset.Id = def.Id;
                asset.DisplayName = def.DisplayName;
                asset.Evidence = (EvidenceId[])def.Evidence.Clone();
                asset.AltEvidence = def.AltEvidence;
                asset.Profile = def.Profile;
                asset.Lore = def.Lore;
                asset.Banishment = def.Banishment;

                var r = def.Ritual;
                asset.RitualName = r.Name;
                asset.RitualHint = r.Hint;
                asset.RitualRequirements = (string[])r.Requirements.Clone();
                asset.RequiresFlashlightOff = r.RequiresFlashlightOff;
                asset.RequiresRelic = r.RequiresRelic;
                asset.RequiresMoonPulse = r.RequiresMoonPulse;
                asset.MoonPulsePeriod = r.MoonPulsePeriod > 0 ? r.MoonPulsePeriod : 25;
                asset.MoonPulseWindow = r.MoonPulseWindow > 0 ? r.MoonPulseWindow : 4;
                asset.MinWardsNearCrypt = r.MinWardsNearCrypt;
                asset.WardNearCryptRadius = r.WardNearCryptRadius > 0 ? r.WardNearCryptRadius : 2;
                asset.RequiresWardOnCrypt = r.RequiresWardOnCrypt;
                asset.StillSeconds = r.StillSeconds;
                asset.MinHuntersOnCrypt = r.MinHuntersOnCrypt;
                asset.RequiresAllHuntersOnCrypt = r.RequiresAllHuntersOnCrypt;
                asset.MaxThreatPercent = r.MaxThreatPercent;
                asset.RequiresZeroWards = r.RequiresZeroWards;

                asset.EvidenceRefs = def.Evidence.Select(e => evidenceAssets[e]).ToArray();
                asset.AltEvidenceRef = evidenceAssets[def.AltEvidence];
                EditorUtility.SetDirty(asset);
            }

            // ---- Difficulties ----
            foreach (var def in NightfallCatalog.Difficulties)
            {
                var asset = LoadOrCreate<DifficultyPresetSO>($"{Root}/Difficulties/{def.Id}.asset");
                asset.Id = def.Id;
                asset.DisplayName = def.DisplayName;
                asset.StartingFunds = def.StartingFunds;
                asset.MoonRate = def.MoonRate;
                asset.FearRate = def.FearRate;
                asset.VampireThreshold = def.VampireThreshold;
                asset.GearSlots = def.GearSlots;
                asset.EvidenceRequired = def.EvidenceRequired;
                asset.RewardMultiplier = def.RewardMultiplier;
                asset.AllowAltEvidence = def.AllowAltEvidence;
                EditorUtility.SetDirty(asset);
            }

            // ---- Loadouts ----
            foreach (var def in NightfallCatalog.Loadouts)
            {
                var asset = LoadOrCreate<LoadoutClassSO>($"{Root}/Loadouts/{def.Id}.asset");
                asset.Id = def.Id;
                asset.DisplayName = def.DisplayName;
                asset.ScanRadius = def.ScanRadius;
                asset.WardCost = def.WardCost;
                asset.DefaultGear = (GearId[])def.DefaultGear.Clone();
                asset.DefaultGearRefs = def.DefaultGear.Select(g => gearAssets[g]).ToArray();
                EditorUtility.SetDirty(asset);
            }

            // ---- Contracts ----
            foreach (var def in NightfallCatalog.Contracts)
            {
                var asset = LoadOrCreate<ContractSO>($"{Root}/Contracts/{def.Id}.asset");
                asset.ContractId = def.Id;
                asset.DisplayName = def.DisplayName;
                asset.Objective = def.Objective;
                asset.Level = def.Level;
                asset.Floors = def.Floors.Select(f => new ContractFloor
                {
                    MapRows = (string[])f.MapRows.Clone(),
                    Stairs = f.Stairs.Select(s => new ContractStair { X = s.X, Y = s.Y, ToFloor = s.ToFloor }).ToArray()
                }).ToArray();
                asset.ClueSpots = def.ClueSpots.Select(t => new ContractTile { X = t.X, Y = t.Y, Floor = t.Floor }).ToArray();
                asset.CryptPosition = new ContractTile { X = def.CryptPosition.X, Y = def.CryptPosition.Y, Floor = def.CryptPosition.Floor };
                asset.VampireStart = new ContractTile { X = def.VampireStart.X, Y = def.VampireStart.Y, Floor = def.VampireStart.Floor };
                EditorUtility.SetDirty(asset);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            int problems = Validate();
            Debug.Log(problems == 0
                ? "[Nightfall] Game data generated: 10 evidence, 10 gear, 10 vampires, 5 difficulties, 4 loadouts, 7 contracts. Validation passed."
                : $"[Nightfall] Game data generated, but validation found {problems} problem(s) — see warnings above.");
        }

        [MenuItem("Nightfall/Validate Data Only")]
        public static void ValidateMenu()
        {
            int problems = Validate();
            Debug.Log(problems == 0
                ? "[Nightfall] Validation passed."
                : $"[Nightfall] Validation found {problems} problem(s) — see warnings above.");
        }

        private static int Validate()
        {
            int problems = 0;

            // Unique 3-evidence signatures — the deduction game depends on it.
            var signatures = new Dictionary<string, VampireId>();
            foreach (var v in NightfallCatalog.Vampires)
            {
                if (v.Evidence.Length != 3)
                {
                    Debug.LogWarning($"[Nightfall] {v.Id} has {v.Evidence.Length} evidence entries (expected 3).");
                    problems++;
                }
                if (v.Evidence.Distinct().Count() != v.Evidence.Length)
                {
                    Debug.LogWarning($"[Nightfall] {v.Id} has duplicate evidence in its signature.");
                    problems++;
                }
                if (v.Evidence.Contains(v.AltEvidence))
                {
                    Debug.LogWarning($"[Nightfall] {v.Id}'s alt evidence duplicates its canonical signature.");
                    problems++;
                }
                var key = string.Join("+", v.Evidence.OrderBy(e => e));
                if (signatures.TryGetValue(key, out var other))
                {
                    Debug.LogWarning($"[Nightfall] {v.Id} and {other} share the signature [{key}] — deduction can never separate them.");
                    problems++;
                }
                else
                {
                    signatures[key] = v.Id;
                }
            }

            // Every evidence type must have exactly one detecting tool.
            foreach (var e in NightfallCatalog.Evidence)
            {
                int detectors = NightfallCatalog.Gear.Count(g => g.Detects == e.Id);
                if (detectors != 1)
                {
                    Debug.LogWarning($"[Nightfall] Evidence {e.Id} has {detectors} detecting tools (expected exactly 1).");
                    problems++;
                }
            }

            // Loadout default gear must fit the largest slot count and exist.
            int maxSlots = NightfallCatalog.Difficulties.Max(d => d.GearSlots);
            foreach (var l in NightfallCatalog.Loadouts)
            {
                if (l.DefaultGear.Length < maxSlots)
                {
                    Debug.LogWarning($"[Nightfall] Loadout {l.Id} has {l.DefaultGear.Length} default gear (< max slots {maxSlots}).");
                    problems++;
                }
                if (l.DefaultGear.Distinct().Count() != l.DefaultGear.Length)
                {
                    Debug.LogWarning($"[Nightfall] Loadout {l.Id} has duplicate default gear.");
                    problems++;
                }
            }

            // Contract integrity: rectangular maps, in-bounds walkable markers.
            foreach (var c in NightfallCatalog.Contracts)
            {
                for (int fi = 0; fi < c.Floors.Length; fi++)
                {
                    var rows = c.Floors[fi].MapRows;
                    int w = rows[0].Length;
                    if (rows.Any(r => r.Length != w))
                    {
                        Debug.LogWarning($"[Nightfall] Contract {c.Id} floor {fi} rows are not all the same width.");
                        problems++;
                    }
                }
                problems += CheckTile(c, c.CryptPosition, "crypt");
                problems += CheckTile(c, c.VampireStart, "vampire start");
                foreach (var spot in c.ClueSpots) problems += CheckTile(c, spot, "clue spot");
                if (c.ClueSpots.Length != 3)
                {
                    Debug.LogWarning($"[Nightfall] Contract {c.Id} has {c.ClueSpots.Length} clue spots (expected 3).");
                    problems++;
                }
            }

            return problems;
        }

        private static int CheckTile(ContractDef c, TilePos t, string label)
        {
            if (t.Floor < 0 || t.Floor >= c.Floors.Length)
            {
                Debug.LogWarning($"[Nightfall] Contract {c.Id}: {label} floor {t.Floor} out of range.");
                return 1;
            }
            var rows = c.Floors[t.Floor].MapRows;
            if (t.Y < 0 || t.Y >= rows.Length || t.X < 0 || t.X >= rows[t.Y].Length)
            {
                Debug.LogWarning($"[Nightfall] Contract {c.Id}: {label} ({t.X},{t.Y}) out of bounds on floor {t.Floor}.");
                return 1;
            }
            if (rows[t.Y][t.X] == '#')
            {
                Debug.LogWarning($"[Nightfall] Contract {c.Id}: {label} ({t.X},{t.Y}) sits inside a wall on floor {t.Floor}.");
                return 1;
            }
            return 0;
        }

        private static T LoadOrCreate<T>(string path) where T : ScriptableObject
        {
            var existing = AssetDatabase.LoadAssetAtPath<T>(path);
            if (existing != null) return existing;
            var created = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(created, path);
            return created;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            var leaf = Path.GetFileName(path);
            if (!string.IsNullOrEmpty(parent) && !AssetDatabase.IsValidFolder(parent))
            {
                EnsureFolder(parent);
            }
            AssetDatabase.CreateFolder(parent, leaf);
        }
    }
}
