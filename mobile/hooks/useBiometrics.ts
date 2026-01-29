import * as LocalAuthentication from "expo-local-authentication";
import { useState, useEffect } from "react";
import { mmkvStorage } from "../lib/storage";

const BIOMETRICS_KEY = "user-biometrics-enabled";

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnabled, setIsEnabled] = useState(
    mmkvStorage.getItem(BIOMETRICS_KEY) === "true",
  );
  const [authType, setAuthType] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);

  useEffect(() => {
    const init = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      setIsSupported(hasHardware);
      setIsEnrolled(isEnrolled);
      setAuthType(types);
    };

    init();
  }, []);

  const authenticate = async (reason: string = "Authenticate to proceed") => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (e) {
      console.error("Biometric Auth Error:", e);
      return false;
    }
  };

  const toggleBiometrics = async (value: boolean) => {
    if (!isSupported || !isEnrolled) return false;

    // Always authenticate when changing this sensitive setting
    const success = await authenticate(
      value ? "Enable Biometric Security" : "Disable Biometric Security",
    );

    if (success) {
      setIsEnabled(value);
      mmkvStorage.setItem(BIOMETRICS_KEY, value ? "true" : "false");
      return true;
    }
    return false;
  };

  return {
    isSupported,
    isEnrolled,
    isEnabled,
    authType,
    authenticate,
    toggleBiometrics,
  };
}
