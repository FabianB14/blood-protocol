// THE canonical Nightfall game data, ported 1:1 from server/index.js in the
// web build. Pure C# (no UnityEngine) so the same file can back a headless
// authoritative server later. The editor-side NightfallDataGenerator turns
// these definitions into ScriptableObject assets.
//
// If you tune numbers here, re-run  Nightfall -> Generate Game Data  and,
// if the web build is still live, mirror the change in server/index.js.

using System;
using System.Collections.Generic;
using System.Linq;

namespace Nightfall
{
    [Serializable]
    public class EvidenceDef
    {
        public EvidenceId Id;
        public string DisplayName;
        public string Description;
    }

    [Serializable]
    public class GearDef
    {
        public GearId Id;
        public string DisplayName;
        public EvidenceId Detects;
        public string Tag;
    }

    [Serializable]
    public class RitualDef
    {
        public string Name;
        public string[] Requirements;
        public string Hint;

        // Machine-checkable conditions. A banish attempt passes when every
        // enabled condition is satisfied. Mirrors rituals{} in server/index.js.
        public bool RequiresFlashlightOff;
        public bool RequiresRelic;
        public bool RequiresMoonPulse;      // moon% mod MoonPulsePeriod <= MoonPulseWindow
        public int MoonPulsePeriod;
        public int MoonPulseWindow;
        public int MinWardsNearCrypt;       // 0 = not required
        public int WardNearCryptRadius;     // tile radius for the above
        public bool RequiresWardOnCrypt;
        public float StillSeconds;          // 0 = not required
        public int MinHuntersOnCrypt;       // 0 = not required
        public bool RequiresAllHuntersOnCrypt;
        public float MaxThreatPercent;      // < 0 = not required
        public bool RequiresZeroWards;

        public RitualDef()
        {
            MaxThreatPercent = -1f;
        }
    }

    [Serializable]
    public class VampireDef
    {
        public VampireId Id;
        public string DisplayName;
        public EvidenceId[] Evidence;       // canonical 3-evidence signature
        public EvidenceId AltEvidence;      // Nightmare-only 4th tell
        public string Banishment;           // flavor text, revealed at match end
        public string Profile;              // one-line field description
        public string Lore;                 // full journal backstory
        public RitualDef Ritual;
    }

    [Serializable]
    public class DifficultyDef
    {
        public DifficultyId Id;
        public string DisplayName;
        public int StartingFunds;
        public float MoonRate;
        public float FearRate;
        public int VampireThreshold;        // threat % at which pursuit starts
        public int GearSlots;
        public int EvidenceRequired;
        public float RewardMultiplier;
        public bool AllowAltEvidence;       // Nightmare's 3-of-4 draw
    }

    [Serializable]
    public class LoadoutDef
    {
        public LoadoutClass Id;
        public string DisplayName;
        public float ScanRadius;
        public int WardCost;
        public GearId[] DefaultGear;
    }

    [Serializable]
    public struct TilePos
    {
        public int X;
        public int Y;
        public int Floor;

        public TilePos(int x, int y, int floor)
        {
            X = x;
            Y = y;
            Floor = floor;
        }
    }

    [Serializable]
    public class StairDef
    {
        public int X;
        public int Y;
        public int ToFloor;
    }

    [Serializable]
    public class FloorDef
    {
        // Row strings, one char per tile:
        // '#' wall  '.' open  'S' safe/spawn  'C' crypt  'K' vault
        // 'U' stairs up  'D' stairs down
        public string[] MapRows;
        public StairDef[] Stairs;
    }

    [Serializable]
    public class ContractDef
    {
        public string Id;                   // matches web build contract ids
        public string DisplayName;
        public string Objective;
        public int Level;
        public FloorDef[] Floors;
        public TilePos[] ClueSpots;         // always 3 in current maps
        public TilePos CryptPosition;
        public TilePos VampireStart;
    }

    public static class NightfallCatalog
    {
        // ------------------------------------------------------------------
        // Evidence — the 10 canonical types
        // ------------------------------------------------------------------
        public static readonly EvidenceDef[] Evidence =
        {
            new EvidenceDef { Id = EvidenceId.BloodTraces, DisplayName = "Blood Traces",         Description = "Glowing residue under UV light." },
            new EvidenceDef { Id = EvidenceId.Emf,         DisplayName = "EMF Readings",         Description = "Electromagnetic field fluctuations." },
            new EvidenceDef { Id = EvidenceId.Thermal,     DisplayName = "Thermal Anomalies",    Description = "Cold spots or heat trails." },
            new EvidenceDef { Id = EvidenceId.Spectral,    DisplayName = "Spectral Echoes",      Description = "Psychic imprints and whispers." },
            new EvidenceDef { Id = EvidenceId.Physical,    DisplayName = "Physical Traces",      Description = "Claw marks, bites, and scrapes." },
            new EvidenceDef { Id = EvidenceId.Ectoplasm,   DisplayName = "Ectoplasmic Residue",  Description = "Supernatural slime or mist." },
            new EvidenceDef { Id = EvidenceId.Pheromones,  DisplayName = "Pheromone Signatures", Description = "Territorial or hunting chemistry." },
            new EvidenceDef { Id = EvidenceId.Temporal,    DisplayName = "Temporal Distortions", Description = "Local time anomalies." },
            new EvidenceDef { Id = EvidenceId.Aura,        DisplayName = "Aura Imprints",        Description = "Lingering energy signatures." },
            new EvidenceDef { Id = EvidenceId.Sonic,       DisplayName = "Sonic Frequencies",    Description = "Sounds outside human hearing." }
        };

        // ------------------------------------------------------------------
        // Gear — one tool per evidence type
        // ------------------------------------------------------------------
        public static readonly GearDef[] Gear =
        {
            new GearDef { Id = GearId.UvFlashlight,      DisplayName = "UV Flashlight",         Detects = EvidenceId.BloodTraces, Tag = "Reveals supernatural blood residue" },
            new GearDef { Id = GearId.EmfReader,         DisplayName = "EMF Reader",            Detects = EvidenceId.Emf,         Tag = "Detects vampire EM fields" },
            new GearDef { Id = GearId.ThermalCamera,     DisplayName = "Thermal Camera",        Detects = EvidenceId.Thermal,     Tag = "Cold spots and heat trails" },
            new GearDef { Id = GearId.SpiritBox,         DisplayName = "Spirit Box",            Detects = EvidenceId.Spectral,    Tag = "Captures psychic whispers" },
            new GearDef { Id = GearId.FieldKit,          DisplayName = "Alchemist Field Kit",   Detects = EvidenceId.Physical,    Tag = "Analyzes claw and bite marks" },
            new GearDef { Id = GearId.EctoplasmDetector, DisplayName = "Ectoplasm Detector",    Detects = EvidenceId.Ectoplasm,   Tag = "Reacts to supernatural slime" },
            new GearDef { Id = GearId.PheromoneAnalyzer, DisplayName = "Pheromone Analyzer",    Detects = EvidenceId.Pheromones,  Tag = "Picks up territorial markers" },
            new GearDef { Id = GearId.Chronometer,       DisplayName = "Chronometer",           Detects = EvidenceId.Temporal,    Tag = "Detects time anomalies" },
            new GearDef { Id = GearId.AuraReader,        DisplayName = "Aura Reader",           Detects = EvidenceId.Aura,        Tag = "Sees lingering energy" },
            new GearDef { Id = GearId.UltrasonicMic,     DisplayName = "Ultrasonic Microphone", Detects = EvidenceId.Sonic,       Tag = "Records inhuman frequencies" }
        };

        // ------------------------------------------------------------------
        // Vampires — 10 species, unique 3-evidence signatures + Nightmare tell
        // ------------------------------------------------------------------
        public static readonly VampireDef[] Vampires =
        {
            new VampireDef
            {
                Id = VampireId.Nosferatu,
                DisplayName = "Nosferatu",
                Evidence = new[] { EvidenceId.Physical, EvidenceId.Emf, EvidenceId.Pheromones },
                AltEvidence = EvidenceId.Thermal,
                Banishment = "Mirror shards and blessed salt, performed in total darkness.",
                Profile = "Aggressive, light-sensitive, overtly predatory. The classic 'first hunt' vampire.",
                Lore = "The Nosferatu strain descends from the plague-priests of Borgo Vrânia, who clawed up from quarantine pits with the disease still on them. They climb walls and ceilings, breathe a fear pheromone that buckles the knees, and pace just outside the lantern light. Hunters report the same dream the night before a sighting: a long corridor, scraped along the ceiling. Light is their leash — sever it, and they hunt unbound.",
                Ritual = new RitualDef
                {
                    Name = "Mirror and Salt",
                    Requirements = new[] { "Turn your flashlight off before sealing." },
                    Hint = "Toggle your flashlight off, then perform the rite.",
                    RequiresFlashlightOff = true
                }
            },
            new VampireDef
            {
                Id = VampireId.Noble,
                DisplayName = "Vampiric Noble",
                Evidence = new[] { EvidenceId.Spectral, EvidenceId.Physical, EvidenceId.Aura },
                AltEvidence = EvidenceId.Pheromones,
                Banishment = "Personal belonging ritual at midnight, under moonlight.",
                Profile = "Aristocratic. Charming, dangerous, surrounded by quiet luxury.",
                Lore = "The Noble line are old money — courts, salons, royal physicians who never aged. They thrall the weak-willed with a glance and dissolve into bat-swarms when cornered. Most still keep the manners. A relic of their mortal life — a locket, a signet ring, a stained letter — anchors them to the world; until that anchor is destroyed under moonlight, no banishment holds. They speak first, before they feed.",
                Ritual = new RitualDef
                {
                    Name = "Personal Effect",
                    Requirements = new[] { "Pick up the Noble's relic from the vault.", "Seal during a midnight pulse (every full 25%-moon mark)." },
                    Hint = "Carry the glowing relic from the vault; wait for the moon's pulse.",
                    RequiresRelic = true,
                    RequiresMoonPulse = true,
                    MoonPulsePeriod = 25,
                    MoonPulseWindow = 4
                }
            },
            new VampireDef
            {
                Id = VampireId.ShadeStalker,
                DisplayName = "Shade Stalker",
                Evidence = new[] { EvidenceId.Thermal, EvidenceId.Spectral, EvidenceId.BloodTraces },
                AltEvidence = EvidenceId.Aura,
                Banishment = "Burn special incense, flood with bright light.",
                Profile = "Near-invisible in darkness. Hunts through connected shadows.",
                Lore = "Shade Stalkers don't walk between rooms — they fall into one shadow and rise from another, treating darkness like tunnels. A drop in air temperature and a whisper just behind your ear is usually the only warning. They drain life on contact and leave a residue under UV that looks like rust shaped like fingers. Burn the chrism, light every corner, and the shadow-tunnels collapse on them.",
                Ritual = new RitualDef
                {
                    Name = "Floodlight",
                    Requirements = new[] { "Burn 2 or more wards within 2 tiles of the crypt before sealing." },
                    Hint = "Place wards adjacent to the crypt.",
                    MinWardsNearCrypt = 2,
                    WardNearCryptRadius = 2
                }
            },
            new VampireDef
            {
                Id = VampireId.BloodAlchemist,
                DisplayName = "Blood Alchemist",
                Evidence = new[] { EvidenceId.BloodTraces, EvidenceId.Physical, EvidenceId.Pheromones },
                AltEvidence = EvidenceId.Ectoplasm,
                Banishment = "Holy water + its own blood; destroy its alchemical focus.",
                Profile = "A vampire-scholar that has weaponized its own biology.",
                Lore = "Cabaret of the Crimson Compass, 1881 — three medical students published a paper on transmuting blood to silver. Two were hanged. The third went missing, then started leaving alchemical sigils painted in his own arteries on basement walls. Blood Alchemists construct weapons out of their fluids and sense fresh wounds from across a city. Destroying their focus — an athanor, a still, a glass alembic at the lair's center — is the only way the rite holds.",
                Ritual = new RitualDef
                {
                    Name = "Shatter the Focus",
                    Requirements = new[] { "Burn a ward directly on the crypt tile." },
                    Hint = "Stand on the crypt and place a ward before the rite.",
                    RequiresWardOnCrypt = true
                }
            },
            new VampireDef
            {
                Id = VampireId.MistWalker,
                DisplayName = "Mist Walker",
                Evidence = new[] { EvidenceId.Ectoplasm, EvidenceId.Emf, EvidenceId.Thermal },
                AltEvidence = EvidenceId.Aura,
                Banishment = "Trap the mist in a prepared vessel; zero air currents.",
                Profile = "Doesn't fight — seeps. Hard to corner, harder to confirm.",
                Lore = "Mist Walkers are graveyard fog given purpose. They cross under doors, through keyholes, into your lungs while you sleep. Their touch induces hallucinations of being underwater. They can't be cut — they can only be condensed. Bring an iron vessel, seal every draft, and the mist is forced back into a body just long enough to bind.",
                Ritual = new RitualDef
                {
                    Name = "Still the Air",
                    Requirements = new[] { "Stand still in the crypt for 3 seconds, then seal." },
                    Hint = "Stop moving for a few seconds before performing the rite.",
                    StillSeconds = 3f
                }
            },
            new VampireDef
            {
                Id = VampireId.Chronovampire,
                DisplayName = "Chronovampire",
                Evidence = new[] { EvidenceId.Temporal, EvidenceId.Physical, EvidenceId.Spectral },
                AltEvidence = EvidenceId.Emf,
                Banishment = "Synced cross-time actions using a mortal-past artifact.",
                Profile = "Ancient and rare. Bends local time, ages victims with a touch.",
                Lore = "The first Chronovampires were astronomer-priests who hung their souls on the wrong star. Time eddies around them — clocks unwind, dust freezes mid-fall, mortals age sixty years in a single touch. They see your next move three seconds before you do. The only working ritual requires two hunters acting in synchrony with a relic from the vampire's living years, severing its present from its future at the same instant.",
                Ritual = new RitualDef
                {
                    Name = "Synchronised Vow",
                    Requirements = new[] { "Have at least 2 hunters standing on the crypt." },
                    Hint = "Coordinate with a teammate — both stand on the crypt.",
                    MinHuntersOnCrypt = 2
                }
            },
            new VampireDef
            {
                Id = VampireId.PsychicLeech,
                DisplayName = "Psychic Leech",
                Evidence = new[] { EvidenceId.Aura, EvidenceId.Spectral, EvidenceId.Sonic },
                AltEvidence = EvidenceId.Temporal,
                Banishment = "Combined mental focus of the full team; break illusions.",
                Profile = "Feeds on mental energy, not blood. Hardest species to identify.",
                Lore = "Psychic Leeches don't bleed their victims — they sip from them, year after year, until the host can't remember their own name. They leave no physical trace; only auras and the same déjà vu in every survivor's testimony. Their projections are vivid enough to walk through. The full team must hold a single intention in their minds while the illusions break, or the rite splinters into nightmare.",
                Ritual = new RitualDef
                {
                    Name = "Unified Focus",
                    Requirements = new[] { "All living hunters must be on the crypt at the moment of sealing." },
                    Hint = "Wait until the whole team is at the crypt.",
                    RequiresAllHuntersOnCrypt = true
                }
            },
            new VampireDef
            {
                Id = VampireId.Feral,
                DisplayName = "Feral Bloodline",
                Evidence = new[] { EvidenceId.Physical, EvidenceId.Pheromones, EvidenceId.Thermal },
                AltEvidence = EvidenceId.BloodTraces,
                Banishment = "Silver caging circle; calm the feral nature.",
                Profile = "A vampire that has surrendered to the beast.",
                Lore = "Every bloodline produces a few who let the beast win. The Feral strain are hunched, fast, animal-hot — their bite carries a rabies-adjacent infection that kills within days. They communicate in growls and scent. Cage them with silver, sing the calming verses your order memorized as a child, and the human shape returns long enough to die properly.",
                Ritual = new RitualDef
                {
                    Name = "Cage and Calm",
                    Requirements = new[] { "Drop the vampire's threat to 20% or lower before sealing." },
                    Hint = "Wards lower threat. Keep placing them until the meter falls.",
                    MaxThreatPercent = 20f
                }
            },
            new VampireDef
            {
                Id = VampireId.TechHybrid,
                DisplayName = "Technological Hybrid",
                Evidence = new[] { EvidenceId.Emf, EvidenceId.Physical, EvidenceId.Sonic },
                AltEvidence = EvidenceId.Temporal,
                Banishment = "Isolate from all tech; trigger an EMP at the climax.",
                Profile = "A modern horror — half vampire, half machine.",
                Lore = "Synthemata Industries' R&D wing went dark in 2019. Three of their engineers walked out four months later with parts of their nervous systems replaced and an appetite that no diet plan addressed. Technological Hybrids talk to electronics the way other vampires talk to bats. They corrupt evidence in real time, swap camera feeds, drain your radio. The EMP at the rite's peak silences them long enough for the holy work to finish.",
                Ritual = new RitualDef
                {
                    Name = "EMP Silence",
                    Requirements = new[] { "Turn your flashlight off.", "No wards may be burning when you seal." },
                    Hint = "Flashlight off, and avoid placing wards this match.",
                    RequiresFlashlightOff = true,
                    RequiresZeroWards = true
                }
            },
            new VampireDef
            {
                Id = VampireId.Dreamweaver,
                DisplayName = "Dreamweaver",
                Evidence = new[] { EvidenceId.Spectral, EvidenceId.Aura, EvidenceId.Sonic },
                AltEvidence = EvidenceId.Ectoplasm,
                Banishment = "Lucid dream together; confront the vampire on its ground.",
                Profile = "Hunts in sleep. Victims appear unharmed and unwakeable.",
                Lore = "Dreamweavers live in REM the way you live in your apartment. They feed on nightmares, and they're patient — many of their victims simply lie in beds, hearts beating, faces serene, for decades. Solo hunters die in the dream and never come back. Only a full team, mid-lucid, can corner one on its own territory. Bring something familiar from the waking world to anchor yourself.",
                Ritual = new RitualDef
                {
                    Name = "Lucid Vigil",
                    Requirements = new[] { "Stand still in the crypt for 3 seconds.", "Flashlight must be off (no waking light)." },
                    Hint = "Flashlight off, hold still on the crypt.",
                    RequiresFlashlightOff = true,
                    StillSeconds = 3f
                }
            }
        };

        // ------------------------------------------------------------------
        // Difficulties
        // ------------------------------------------------------------------
        public static readonly DifficultyDef[] Difficulties =
        {
            new DifficultyDef { Id = DifficultyId.Amateur,    DisplayName = "Amateur",    StartingFunds = 800, MoonRate = 1.0f, FearRate = 1.2f, VampireThreshold = 32, GearSlots = 4, EvidenceRequired = 3, RewardMultiplier = 0.9f, AllowAltEvidence = false },
            new DifficultyDef { Id = DifficultyId.Standard,   DisplayName = "Standard",   StartingFunds = 640, MoonRate = 1.4f, FearRate = 1.5f, VampireThreshold = 22, GearSlots = 3, EvidenceRequired = 3, RewardMultiplier = 1.0f, AllowAltEvidence = false },
            new DifficultyDef { Id = DifficultyId.Tense,      DisplayName = "Tense",      StartingFunds = 520, MoonRate = 1.8f, FearRate = 1.8f, VampireThreshold = 16, GearSlots = 3, EvidenceRequired = 3, RewardMultiplier = 1.3f, AllowAltEvidence = false },
            new DifficultyDef { Id = DifficultyId.Aggressive, DisplayName = "Aggressive", StartingFunds = 420, MoonRate = 2.2f, FearRate = 2.2f, VampireThreshold = 12, GearSlots = 3, EvidenceRequired = 2, RewardMultiplier = 1.6f, AllowAltEvidence = false },
            new DifficultyDef { Id = DifficultyId.Nightmare,  DisplayName = "Nightmare",  StartingFunds = 320, MoonRate = 2.8f, FearRate = 2.6f, VampireThreshold = 8,  GearSlots = 2, EvidenceRequired = 2, RewardMultiplier = 2.3f, AllowAltEvidence = true }
        };

        // ------------------------------------------------------------------
        // Hunter classes
        // ------------------------------------------------------------------
        public static readonly LoadoutDef[] Loadouts =
        {
            new LoadoutDef { Id = LoadoutClass.Occultist, DisplayName = "Occultist", ScanRadius = 3.4f, WardCost = 60, DefaultGear = new[] { GearId.AuraReader, GearId.SpiritBox, GearId.UvFlashlight, GearId.EmfReader } },
            new LoadoutDef { Id = LoadoutClass.Sentinel,  DisplayName = "Sentinel",  ScanRadius = 1.8f, WardCost = 35, DefaultGear = new[] { GearId.EmfReader, GearId.UvFlashlight, GearId.ThermalCamera, GearId.PheromoneAnalyzer } },
            new LoadoutDef { Id = LoadoutClass.Medium,    DisplayName = "Medium",    ScanRadius = 2.6f, WardCost = 50, DefaultGear = new[] { GearId.SpiritBox, GearId.UltrasonicMic, GearId.AuraReader, GearId.Chronometer } },
            new LoadoutDef { Id = LoadoutClass.Alchemist, DisplayName = "Alchemist", ScanRadius = 2.0f, WardCost = 45, DefaultGear = new[] { GearId.FieldKit, GearId.EctoplasmDetector, GearId.PheromoneAnalyzer, GearId.ThermalCamera } }
        };

        // ------------------------------------------------------------------
        // Contracts — 7 maps ported from the web build (tile grids)
        // ------------------------------------------------------------------
        public static readonly ContractDef[] Contracts =
        {
            new ContractDef
            {
                Id = "ashbury",
                DisplayName = "Ashbury Manor",
                Objective = "Identify the bloodline, find the sealed crypt, and close the family coffin.",
                Level = 1,
                Floors = new[]
                {
                    new FloorDef
                    {
                        MapRows = new[]
                        {
                            "############",
                            "#S..#......#",
                            "#...#..#...#",
                            "#......#...#",
                            "###.##...###",
                            "#...C..#...#",
                            "#..##..#...#",
                            "#......K...#",
                            "############"
                        },
                        Stairs = new StairDef[0]
                    }
                },
                ClueSpots = new[] { new TilePos(7, 1, 0), new TilePos(5, 5, 0), new TilePos(8, 7, 0) },
                CryptPosition = new TilePos(4, 5, 0),
                VampireStart = new TilePos(9, 1, 0)
            },
            new ContractDef
            {
                Id = "orla",
                DisplayName = "Saint Orla's Hospice",
                Objective = "Stabilize the ward, collect patient evidence, and seal the chapel ossuary.",
                Level = 2,
                Floors = new[]
                {
                    new FloorDef
                    {
                        MapRows = new[]
                        {
                            "############",
                            "#S.....#...#",
                            "#.###..#.#.#",
                            "#...#....#.#",
                            "###.#.####.#",
                            "#...#C.....#",
                            "#.###..###.#",
                            "#.....K....#",
                            "############"
                        },
                        Stairs = new StairDef[0]
                    }
                },
                ClueSpots = new[] { new TilePos(6, 1, 0), new TilePos(9, 5, 0), new TilePos(5, 7, 0) },
                CryptPosition = new TilePos(5, 5, 0),
                VampireStart = new TilePos(10, 7, 0)
            },
            new ContractDef
            {
                Id = "blackwater",
                DisplayName = "Blackwater Theatre",
                Objective = "Trace the midnight performance, mark the stage relics, and bind the backstage coffin.",
                Level = 3,
                Floors = new[]
                {
                    new FloorDef
                    {
                        MapRows = new[]
                        {
                            "############",
                            "#S....#....#",
                            "#.##..#..#.#",
                            "#......K.#.#",
                            "#.####.#...#",
                            "#....#.#C###",
                            "###..#.....#",
                            "#..........#",
                            "############"
                        },
                        Stairs = new StairDef[0]
                    }
                },
                ClueSpots = new[] { new TilePos(5, 1, 0), new TilePos(7, 3, 0), new TilePos(2, 7, 0) },
                CryptPosition = new TilePos(8, 5, 0),
                VampireStart = new TilePos(9, 6, 0)
            },
            new ContractDef
            {
                Id = "greywick",
                DisplayName = "Greywick Station",
                Objective = "Search the abandoned platform, map the possessed signal, and seal the baggage vault.",
                Level = 4,
                Floors = new[]
                {
                    new FloorDef
                    {
                        MapRows = new[]
                        {
                            "############",
                            "#S..#......#",
                            "#.#.#.####.#",
                            "#.#...#K...#",
                            "#.#####.##.#",
                            "#.....#C...#",
                            "###.#.###..#",
                            "#...#......#",
                            "############"
                        },
                        Stairs = new StairDef[0]
                    }
                },
                ClueSpots = new[] { new TilePos(10, 1, 0), new TilePos(7, 3, 0), new TilePos(3, 7, 0) },
                CryptPosition = new TilePos(7, 5, 0),
                VampireStart = new TilePos(10, 5, 0)
            },
            new ContractDef
            {
                Id = "lazarus",
                DisplayName = "Lazarus Industries",
                Objective = "Trace the corrupted servers, isolate the lab, and EMP the cradle in the lower vault.",
                Level = 3,
                Floors = new[]
                {
                    new FloorDef
                    {
                        MapRows = new[]
                        {
                            "############",
                            "#S....#....#",
                            "#.##...#.#.#",
                            "#......#...#",
                            "###....###.#",
                            "#...C..#K..#",
                            "#..##.....##",
                            "#.....##...#",
                            "############"
                        },
                        Stairs = new StairDef[0]
                    }
                },
                ClueSpots = new[] { new TilePos(7, 1, 0), new TilePos(3, 3, 0), new TilePos(8, 7, 0) },
                CryptPosition = new TilePos(4, 5, 0),
                VampireStart = new TilePos(10, 1, 0)
            },
            new ContractDef
            {
                Id = "wraithmoor",
                DisplayName = "Wraithmoor Sanitarium",
                Objective = "Map the patient ward, recover the dream journals, and break the leech's grip.",
                Level = 3,
                Floors = new[]
                {
                    new FloorDef
                    {
                        MapRows = new[]
                        {
                            "############",
                            "#S..#..#...#",
                            "#...#......#",
                            "#.###.##.#.#",
                            "#.....#....#",
                            "#.###.#.#.##",
                            "#C..#.#...K#",
                            "#......##..#",
                            "############"
                        },
                        Stairs = new StairDef[0]
                    }
                },
                ClueSpots = new[] { new TilePos(5, 1, 0), new TilePos(9, 4, 0), new TilePos(3, 7, 0) },
                CryptPosition = new TilePos(1, 6, 0),
                VampireStart = new TilePos(9, 6, 0)
            },
            new ContractDef
            {
                Id = "ravenhall",
                DisplayName = "Ravenhall Estate",
                Objective = "Slip through the ballroom, recover a personal effect, and complete the midnight rite.",
                Level = 2,
                Floors = new[]
                {
                    new FloorDef
                    {
                        // Floor 0: ground-level ballroom / drawing room
                        MapRows = new[]
                        {
                            "############",
                            "#S.....#...#",
                            "#.##.#.#.#.#",
                            "#....#.U.#.#",
                            "###.##.###.#",
                            "#.....C....#",
                            "#.##.###.#.#",
                            "#K.........#",
                            "############"
                        },
                        Stairs = new[] { new StairDef { X = 7, Y = 3, ToFloor = 1 } }
                    },
                    new FloorDef
                    {
                        // Floor 1: bedrooms over the ballroom
                        MapRows = new[]
                        {
                            "############",
                            "#..........#",
                            "#..####....#",
                            "#..#..#D...#",
                            "#..#..#....#",
                            "#..####....#",
                            "#..........#",
                            "#..........#",
                            "############"
                        },
                        Stairs = new[] { new StairDef { X = 7, Y = 3, ToFloor = 0 } }
                    }
                },
                ClueSpots = new[] { new TilePos(9, 1, 0), new TilePos(2, 7, 0), new TilePos(4, 4, 1) },
                CryptPosition = new TilePos(6, 5, 0),
                VampireStart = new TilePos(9, 7, 0)
            }
        };

        // ------------------------------------------------------------------
        // Lookups
        // ------------------------------------------------------------------
        public static VampireDef GetVampire(VampireId id)
        {
            return Vampires.First(v => v.Id == id);
        }

        public static GearDef GetGear(GearId id)
        {
            return Gear.First(g => g.Id == id);
        }

        public static EvidenceDef GetEvidence(EvidenceId id)
        {
            return Evidence.First(e => e.Id == id);
        }

        public static DifficultyDef GetDifficulty(DifficultyId id)
        {
            return Difficulties.First(d => d.Id == id);
        }

        public static LoadoutDef GetLoadout(LoadoutClass id)
        {
            return Loadouts.First(l => l.Id == id);
        }

        public static ContractDef GetContract(string id)
        {
            return Contracts.First(c => c.Id == id);
        }

        /// <summary>
        /// The full evidence pool a species can present. On Nightmare
        /// (allowAlt), the 4th "tell" joins the canonical 3.
        /// </summary>
        public static IEnumerable<EvidenceId> FullPool(VampireDef v, bool allowAlt)
        {
            foreach (var e in v.Evidence) yield return e;
            if (allowAlt) yield return v.AltEvidence;
        }
    }
}
