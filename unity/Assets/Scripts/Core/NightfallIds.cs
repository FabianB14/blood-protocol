// Canonical identifiers for every data-driven entity in Nightfall.
// The StringId helpers map to the ids used by the web build's Node server
// (server/index.js) so save data / analytics stay comparable across both.

namespace Nightfall
{
    public enum EvidenceId
    {
        BloodTraces,
        Emf,
        Thermal,
        Spectral,
        Physical,
        Ectoplasm,
        Pheromones,
        Temporal,
        Aura,
        Sonic
    }

    public enum VampireId
    {
        Nosferatu,
        Noble,
        ShadeStalker,
        BloodAlchemist,
        MistWalker,
        Chronovampire,
        PsychicLeech,
        Feral,
        TechHybrid,
        Dreamweaver
    }

    public enum GearId
    {
        UvFlashlight,
        EmfReader,
        ThermalCamera,
        SpiritBox,
        FieldKit,
        EctoplasmDetector,
        PheromoneAnalyzer,
        Chronometer,
        AuraReader,
        UltrasonicMic
    }

    public enum DifficultyId
    {
        Amateur,
        Standard,
        Tense,
        Aggressive,
        Nightmare
    }

    public enum LoadoutClass
    {
        Occultist,
        Sentinel,
        Medium,
        Alchemist
    }

    public static class NightfallStringIds
    {
        public static string Of(EvidenceId id)
        {
            switch (id)
            {
                case EvidenceId.BloodTraces: return "blood_traces";
                case EvidenceId.Emf: return "emf";
                case EvidenceId.Thermal: return "thermal";
                case EvidenceId.Spectral: return "spectral";
                case EvidenceId.Physical: return "physical";
                case EvidenceId.Ectoplasm: return "ectoplasm";
                case EvidenceId.Pheromones: return "pheromones";
                case EvidenceId.Temporal: return "temporal";
                case EvidenceId.Aura: return "aura";
                case EvidenceId.Sonic: return "sonic";
                default: return id.ToString().ToLowerInvariant();
            }
        }

        public static string Of(VampireId id)
        {
            switch (id)
            {
                case VampireId.Nosferatu: return "nosferatu";
                case VampireId.Noble: return "noble";
                case VampireId.ShadeStalker: return "shade_stalker";
                case VampireId.BloodAlchemist: return "blood_alchemist";
                case VampireId.MistWalker: return "mist_walker";
                case VampireId.Chronovampire: return "chronovampire";
                case VampireId.PsychicLeech: return "psychic_leech";
                case VampireId.Feral: return "feral";
                case VampireId.TechHybrid: return "tech_hybrid";
                case VampireId.Dreamweaver: return "dreamweaver";
                default: return id.ToString().ToLowerInvariant();
            }
        }

        public static string Of(GearId id)
        {
            switch (id)
            {
                case GearId.UvFlashlight: return "uv_flashlight";
                case GearId.EmfReader: return "emf_reader";
                case GearId.ThermalCamera: return "thermal_camera";
                case GearId.SpiritBox: return "spirit_box";
                case GearId.FieldKit: return "field_kit";
                case GearId.EctoplasmDetector: return "ectoplasm_detector";
                case GearId.PheromoneAnalyzer: return "pheromone_analyzer";
                case GearId.Chronometer: return "chronometer";
                case GearId.AuraReader: return "aura_reader";
                case GearId.UltrasonicMic: return "ultrasonic_mic";
                default: return id.ToString().ToLowerInvariant();
            }
        }

        public static string Of(DifficultyId id)
        {
            return id.ToString().ToLowerInvariant();
        }

        public static string Of(LoadoutClass id)
        {
            return id.ToString().ToLowerInvariant();
        }
    }
}
