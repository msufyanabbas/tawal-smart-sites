import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "../api/apiClient";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const safeFileName = (siteName?: string): string => {
  const base = (siteName || "Site")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "Site"}_Site_RFP_Report.pptx`;
};

export interface RfpDownloadResult {
  success: boolean;
  message?: string;
  uri?: string;
}

/**
 * Downloads the site's "Smart Tower Site RFP report" deck and hands it to the
 * OS share sheet, so the user can open it in PowerPoint, save it to Files, or
 * mail it on.
 *
 * This deliberately bypasses `apiClient`: the deck is several megabytes of
 * binary, and pulling it through axios would mean holding it in memory as an
 * ArrayBuffer and then base64-encoding it by hand (React Native has no
 * dependable global `btoa`). `downloadAsync` streams it straight to disk
 * instead — but it only issues GET requests and does not run the axios
 * interceptor, so the Authorization header is attached manually here.
 *
 * The file goes to cacheDirectory rather than documentDirectory because it is
 * a regenerable artifact the OS is free to reclaim.
 */
export const downloadSiteRfpReport = async (
  siteId: string,
  siteName?: string,
  narrative?: { currentStatus?: string; nextAction?: string },
): Promise<RfpDownloadResult> => {
  try {
    const token = await AsyncStorage.getItem("access_token");
    if (!token) {
      return { success: false, message: "You are not signed in." };
    }

    const dir = FileSystem.cacheDirectory;
    if (!dir) {
      return { success: false, message: "No writable storage available." };
    }

    // Current Status / Next Action go on the conclusion slide. Blank fields
    // are omitted so the backend falls back to its status-derived wording.
    const params: string[] = [];
    if (narrative?.currentStatus?.trim()) {
      params.push(
        `currentStatus=${encodeURIComponent(narrative.currentStatus.trim())}`,
      );
    }
    if (narrative?.nextAction?.trim()) {
      params.push(
        `nextAction=${encodeURIComponent(narrative.nextAction.trim())}`,
      );
    }
    const qs = params.length ? `?${params.join("&")}` : "";
    const url = `${API_BASE_URL.replace(/\/$/, "")}/reports/sites/${siteId}/rfp${qs}`;
    const target = `${dir}${safeFileName(siteName)}`;

    const result = await FileSystem.downloadAsync(url, target, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status === 401 || result.status === 403) {
      await FileSystem.deleteAsync(target, { idempotent: true });
      return {
        success: false,
        message: "You do not have permission to generate this report.",
      };
    }
    if (result.status !== 200) {
      // A failed request still writes the error body to the target path, so
      // clear it rather than leaving a broken .pptx behind.
      await FileSystem.deleteAsync(target, { idempotent: true });
      return {
        success: false,
        message: `Report request failed (HTTP ${result.status}).`,
      };
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: PPTX_MIME,
        dialogTitle: "Share RFP report",
        UTI: "org.openxmlformats.presentationml.presentation",
      });
      return { success: true, uri: result.uri };
    }

    // Sharing unavailable (mostly simulators). The file is on disk regardless,
    // so report success rather than failing outright.
    return {
      success: true,
      uri: result.uri,
      message: "Report saved to the app's files.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Could not download the report.",
    };
  }
};
