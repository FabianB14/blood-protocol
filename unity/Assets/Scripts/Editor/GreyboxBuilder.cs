// Nightfall -> Build Greybox From Selected Contract
//
// Select a ContractSO asset in the Project window, run the menu item, and
// this builds a walkable greybox of the map in the open scene: walls as
// cubes, floor/ceiling slabs, colored markers for spawn / crypt / vault /
// clue spots / vampire start / stairs, and a dim mood light rig.
//
// Everything lands under one parent GameObject named Greybox_<id>, so a
// rebuild is: delete the parent, run again.

using Nightfall.Data;
using UnityEditor;
using UnityEngine;

namespace Nightfall.EditorTools
{
    public static class GreyboxBuilder
    {
        private const float Tile = NightfallConstants.TileSize;
        private const float WallHeight = NightfallConstants.FloorHeight;

        [MenuItem("Nightfall/Build Greybox From Selected Contract")]
        public static void Build()
        {
            var contract = Selection.activeObject as ContractSO;
            if (contract == null)
            {
                EditorUtility.DisplayDialog(
                    "Nightfall Greybox",
                    "Select a Contract asset in the Project window first (Assets/Data/Contracts).",
                    "OK");
                return;
            }

            var existing = GameObject.Find($"Greybox_{contract.ContractId}");
            if (existing != null)
            {
                if (!EditorUtility.DisplayDialog(
                        "Nightfall Greybox",
                        $"A greybox for '{contract.ContractId}' already exists in this scene. Replace it?",
                        "Replace", "Cancel"))
                {
                    return;
                }
                Object.DestroyImmediate(existing);
            }

            var root = new GameObject($"Greybox_{contract.ContractId}");
            Undo.RegisterCreatedObjectUndo(root, "Build Nightfall Greybox");

            var wallMat = MakeMaterial("Greybox_Wall", new Color(0.16f, 0.16f, 0.18f));
            var floorMat = MakeMaterial("Greybox_Floor", new Color(0.24f, 0.22f, 0.20f));
            var ceilingMat = MakeMaterial("Greybox_Ceiling", new Color(0.10f, 0.10f, 0.12f));

            for (int fi = 0; fi < contract.Floors.Length; fi++)
            {
                var floorRoot = new GameObject($"Floor_{fi}");
                floorRoot.transform.SetParent(root.transform, false);

                var rows = contract.Floors[fi].MapRows;
                int h = rows.Length;
                int w = rows[0].Length;
                float yBase = fi * WallHeight;

                // Floor slab
                var slab = GameObject.CreatePrimitive(PrimitiveType.Cube);
                slab.name = "FloorSlab";
                slab.transform.SetParent(floorRoot.transform, false);
                slab.transform.position = new Vector3(w * Tile / 2f, yBase - 0.05f, h * Tile / 2f);
                slab.transform.localScale = new Vector3(w * Tile, 0.1f, h * Tile);
                slab.GetComponent<Renderer>().sharedMaterial = floorMat;

                // Ceiling slab (skip on the top floor so the greybox stays easy
                // to inspect from the scene view; add it back for light tests)
                if (fi < contract.Floors.Length - 1)
                {
                    var ceiling = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    ceiling.name = "CeilingSlab";
                    ceiling.transform.SetParent(floorRoot.transform, false);
                    ceiling.transform.position = new Vector3(w * Tile / 2f, yBase + WallHeight + 0.05f, h * Tile / 2f);
                    ceiling.transform.localScale = new Vector3(w * Tile, 0.1f, h * Tile);
                    ceiling.GetComponent<Renderer>().sharedMaterial = ceilingMat;
                }

                // Walls
                var wallsRoot = new GameObject("Walls");
                wallsRoot.transform.SetParent(floorRoot.transform, false);
                for (int y = 0; y < h; y++)
                {
                    for (int x = 0; x < rows[y].Length; x++)
                    {
                        char cell = rows[y][x];
                        var center = new Vector3((x + 0.5f) * Tile, yBase, (y + 0.5f) * Tile);

                        if (cell == '#')
                        {
                            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
                            wall.name = $"Wall_{x}_{y}";
                            wall.transform.SetParent(wallsRoot.transform, false);
                            wall.transform.position = center + Vector3.up * (WallHeight / 2f);
                            wall.transform.localScale = new Vector3(Tile, WallHeight, Tile);
                            wall.GetComponent<Renderer>().sharedMaterial = wallMat;
                        }
                        else if (cell == 'S')
                        {
                            AddMarker(floorRoot.transform, "SpawnMarker", center, new Color(0.2f, 0.9f, 0.5f), PrimitiveType.Cylinder);
                        }
                        else if (cell == 'C')
                        {
                            AddMarker(floorRoot.transform, "CryptMarker", center, new Color(0.75f, 0.15f, 0.2f), PrimitiveType.Cube);
                        }
                        else if (cell == 'K')
                        {
                            AddMarker(floorRoot.transform, "VaultMarker", center, new Color(0.95f, 0.8f, 0.3f), PrimitiveType.Cube);
                        }
                        else if (cell == 'U' || cell == 'D')
                        {
                            AddMarker(floorRoot.transform, $"Stairs_{cell}_{x}_{y}", center, new Color(0.35f, 0.55f, 0.95f), PrimitiveType.Cylinder);
                        }
                    }
                }
            }

            // Clue spot markers + small mood lights
            foreach (var spot in contract.ClueSpots)
            {
                float yBase = spot.Floor * WallHeight;
                var pos = new Vector3((spot.X + 0.5f) * Tile, yBase + 1.4f, (spot.Y + 0.5f) * Tile);

                var orb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                orb.name = $"ClueSpot_f{spot.Floor}_{spot.X}_{spot.Y}";
                orb.transform.SetParent(root.transform, false);
                orb.transform.position = pos;
                orb.transform.localScale = Vector3.one * 0.35f;
                orb.GetComponent<Renderer>().sharedMaterial = MakeMaterial("Greybox_Clue", new Color(0.9f, 0.7f, 0.3f));

                var lightGo = new GameObject("ClueLight");
                lightGo.transform.SetParent(orb.transform, false);
                var light = lightGo.AddComponent<Light>();
                light.type = LightType.Point;
                light.color = new Color(0.9f, 0.7f, 0.35f);
                light.intensity = 1.5f;
                light.range = 4f;
            }

            // Vampire start marker
            {
                var t = contract.VampireStart;
                var pos = new Vector3((t.X + 0.5f) * Tile, t.Floor * WallHeight + 1f, (t.Y + 0.5f) * Tile);
                AddMarker(root.transform, "VampireStart", new Vector3(pos.x, t.Floor * WallHeight, pos.z), new Color(0.5f, 0.1f, 0.5f), PrimitiveType.Capsule);
            }

            // Dim mood light so the greybox isn't pitch black before the
            // player flashlight exists in the scene
            var moodGo = new GameObject("MoodLight");
            moodGo.transform.SetParent(root.transform, false);
            moodGo.transform.rotation = Quaternion.Euler(60f, -30f, 0f);
            var mood = moodGo.AddComponent<Light>();
            mood.type = LightType.Directional;
            mood.color = new Color(0.55f, 0.6f, 0.8f);
            mood.intensity = 0.12f;

            Selection.activeGameObject = root;
            Debug.Log($"[Nightfall] Greybox built for '{contract.DisplayName}' " +
                      $"({contract.Floors.Length} floor(s)). Tile={Tile}m, wall height={WallHeight}m. " +
                      "Add a PlayerController capsule at the green spawn marker and press Play.");
        }

        private static void AddMarker(Transform parent, string markerName, Vector3 tileCenter, Color color, PrimitiveType shape)
        {
            var marker = GameObject.CreatePrimitive(shape);
            marker.name = markerName;
            marker.transform.SetParent(parent, false);
            marker.transform.position = tileCenter + Vector3.up * 0.5f;
            marker.transform.localScale = new Vector3(1f, 0.5f, 1f);
            marker.GetComponent<Renderer>().sharedMaterial = MakeMaterial($"Greybox_{markerName}", color);
            // Markers are visual only — no blocking collision
            var collider = marker.GetComponent<Collider>();
            if (collider != null) Object.DestroyImmediate(collider);
        }

        private static Material MakeMaterial(string materialName, Color color)
        {
            // Prefer URP Lit; fall back to Standard for non-URP projects.
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            var mat = new Material(shader) { name = materialName };
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            return mat;
        }
    }
}
