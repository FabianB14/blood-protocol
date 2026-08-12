using System;
using UnityEngine;

namespace Nightfall.Data
{
    [Serializable]
    public class ContractFloor
    {
        [Tooltip("One string per row; '#' wall, '.' open, S spawn, C crypt, K vault, U/D stairs")]
        public string[] MapRows;
        public ContractStair[] Stairs;
    }

    [Serializable]
    public class ContractStair
    {
        public int X;
        public int Y;
        public int ToFloor;
    }

    [Serializable]
    public class ContractTile
    {
        public int X;
        public int Y;
        public int Floor;
    }

    /// <summary>
    /// A contract map: tile layout per floor plus entity positions. These
    /// tile grids drive the greybox builder; final maps will be hand-built
    /// scenes that keep roughly the same footprint. Generated from
    /// NightfallCatalog.
    /// </summary>
    [CreateAssetMenu(menuName = "Nightfall/Contract", fileName = "Contract")]
    public class ContractSO : ScriptableObject
    {
        public string ContractId;           // matches web build ids
        public string DisplayName;
        [TextArea] public string Objective;
        public int Level;

        public ContractFloor[] Floors;
        public ContractTile[] ClueSpots;
        public ContractTile CryptPosition;
        public ContractTile VampireStart;

        [Header("Presentation (assign by hand)")]
        public Sprite LoadingScreen;
        public SceneReferencePlaceholder FinalScene;
    }

    /// <summary>
    /// Placeholder for a scene reference until scenes exist. Swap for a
    /// proper scene-reference solution (Addressables or build-index) once
    /// real level scenes are authored.
    /// </summary>
    [Serializable]
    public class SceneReferencePlaceholder
    {
        public string ScenePath;
    }
}
