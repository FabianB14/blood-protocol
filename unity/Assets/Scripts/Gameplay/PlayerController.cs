// First-person controller for the Nightfall vertical slice.
//
// Setup: create a Capsule (or empty GO with a CharacterController), add this
// component, parent the Main Camera under it at local (0, 0.65, 0). Speeds
// mirror the web build so the two versions feel comparable.
//
// Input: supports BOTH the Input System package (polled directly, no
// .inputactions asset needed) and the legacy Input Manager, chosen by
// what the project has enabled.
//   WASD move / mouse look / Shift sprint / V investigate (slow) /
//   F flashlight / Esc release cursor / click to capture cursor

using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Nightfall.Gameplay
{
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement")]
        public float WalkSpeed = NightfallConstants.WalkSpeed;
        public float SprintSpeed = NightfallConstants.SprintSpeed;
        public float InvestigateMultiplier = NightfallConstants.InvestigateSpeedMultiplier;
        public float Gravity = -18f;

        [Header("Look")]
        public float MouseSensitivity = 2.0f;
        public float PitchClamp = 85f;

        [Header("References")]
        [Tooltip("Camera transform; auto-found from children if left empty")]
        public Transform CameraTransform;
        [Tooltip("Spotlight used as the flashlight; auto-created if left empty")]
        public Light Flashlight;

        public bool IsInvestigating { get; private set; }
        public bool FlashlightOn { get; private set; } = true;

        private CharacterController _controller;
        private float _pitch;
        private float _verticalVelocity;

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();

            if (CameraTransform == null)
            {
                var cam = GetComponentInChildren<Camera>();
                if (cam != null) CameraTransform = cam.transform;
            }

            if (Flashlight == null && CameraTransform != null)
            {
                var lightGo = new GameObject("Flashlight");
                lightGo.transform.SetParent(CameraTransform, false);
                Flashlight = lightGo.AddComponent<Light>();
                Flashlight.type = LightType.Spot;
                Flashlight.range = 22f;
                Flashlight.spotAngle = 50f;
                Flashlight.intensity = 3.5f;
                Flashlight.color = new Color(1f, 0.94f, 0.82f);
                Flashlight.shadows = LightShadows.Hard; // the Phasmo look lives here
            }
        }

        private void Start()
        {
            CaptureCursor();
        }

        private void Update()
        {
            HandleCursor();
            HandleLook();
            HandleMove();
            HandleActions();
        }

        // ------------------------------------------------------------------
        private void HandleCursor()
        {
            if (EscapePressed())
            {
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
            }
            else if (Cursor.lockState != CursorLockMode.Locked && ClickPressed())
            {
                CaptureCursor();
            }
        }

        private void CaptureCursor()
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        private void HandleLook()
        {
            if (Cursor.lockState != CursorLockMode.Locked || CameraTransform == null) return;

            Vector2 delta = LookDelta() * MouseSensitivity;
            transform.Rotate(0f, delta.x, 0f);

            _pitch = Mathf.Clamp(_pitch - delta.y, -PitchClamp, PitchClamp);
            CameraTransform.localRotation = Quaternion.Euler(_pitch, 0f, 0f);
        }

        private void HandleMove()
        {
            Vector2 input = MoveInput();
            IsInvestigating = InvestigateHeld();

            float speed = SprintHeld() && !IsInvestigating ? SprintSpeed : WalkSpeed;
            if (IsInvestigating) speed *= InvestigateMultiplier;

            Vector3 planar = (transform.forward * input.y + transform.right * input.x);
            if (planar.sqrMagnitude > 1f) planar.Normalize();

            if (_controller.isGrounded && _verticalVelocity < 0f) _verticalVelocity = -2f;
            _verticalVelocity += Gravity * Time.deltaTime;

            Vector3 velocity = planar * speed + Vector3.up * _verticalVelocity;
            _controller.Move(velocity * Time.deltaTime);
        }

        private void HandleActions()
        {
            if (FlashlightPressed())
            {
                FlashlightOn = !FlashlightOn;
                if (Flashlight != null) Flashlight.enabled = FlashlightOn;
            }
        }

        // ------------------------------------------------------------------
        // Input abstraction: Input System package when enabled, else legacy.
        // ------------------------------------------------------------------
        private static Vector2 MoveInput()
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            if (kb == null) return Vector2.zero;
            float x = (kb.dKey.isPressed ? 1f : 0f) - (kb.aKey.isPressed ? 1f : 0f);
            float y = (kb.wKey.isPressed ? 1f : 0f) - (kb.sKey.isPressed ? 1f : 0f);
            return new Vector2(x, y);
#else
            return new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
#endif
        }

        private static Vector2 LookDelta()
        {
#if ENABLE_INPUT_SYSTEM
            var mouse = Mouse.current;
            if (mouse == null) return Vector2.zero;
            // Input System mouse delta is in pixels/frame; scale to roughly
            // match legacy GetAxis("Mouse X") feel.
            return mouse.delta.ReadValue() * 0.05f;
#else
            return new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y"));
#endif
        }

        private static bool SprintHeld()
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            return kb != null && (kb.leftShiftKey.isPressed || kb.rightShiftKey.isPressed);
#else
            return Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
#endif
        }

        private static bool InvestigateHeld()
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            return kb != null && kb.vKey.isPressed;
#else
            return Input.GetKey(KeyCode.V);
#endif
        }

        private static bool FlashlightPressed()
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            return kb != null && kb.fKey.wasPressedThisFrame;
#else
            return Input.GetKeyDown(KeyCode.F);
#endif
        }

        private static bool EscapePressed()
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            return kb != null && kb.escapeKey.wasPressedThisFrame;
#else
            return Input.GetKeyDown(KeyCode.Escape);
#endif
        }

        private static bool ClickPressed()
        {
#if ENABLE_INPUT_SYSTEM
            var mouse = Mouse.current;
            return mouse != null && mouse.leftButton.wasPressedThisFrame;
#else
            return Input.GetMouseButtonDown(0);
#endif
        }
    }
}
