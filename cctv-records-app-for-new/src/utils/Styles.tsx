import { colors, fontSize, radius, shadow, spacing } from "../theme";
import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  signedAs: {
    textAlign: "right",
    color: colors.textFaint,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },

  // Header card
  headerCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  siteTitle: { fontSize: fontSize.h1, fontWeight: "700", color: colors.text },
  siteSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  infoCell: {
    flexBasis: "50%",
    paddingHorizontal: 4,
    paddingVertical: spacing.xs,
  },
  infoKey: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoVal: {
    fontSize: fontSize.body,
    color: colors.text,
    marginTop: 2,
    fontWeight: "500",
  },

  // Timeline
  timelineRow: { flexDirection: "row", alignItems: "flex-start" },
  timelineItem: { alignItems: "center", width: 56 },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotPending: { backgroundColor: colors.border },
  timelineLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  timelineAt: {
    fontSize: 8,
    color: colors.textFaint,
    marginTop: 2,
    textAlign: "center",
  },
  timelineConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 15,
  },

  // Counts
  countsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  countBox: {
    flexBasis: "33%",
    padding: 4,
  },
  countLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  countValue: {
    fontSize: fontSize.h2,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },

  // Submitted data
  dataUnit: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  unitHeading: { fontWeight: "700", color: colors.text, marginBottom: 6 },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  dataKey: { color: colors.textMuted, fontSize: fontSize.sm },
  dataVal: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  thumbRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  thumbCaption: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },

  // Entry
  entryUnit: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  imgLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginTop: 6,
  },
  dropdownPlaceholder: {
    fontSize: fontSize.body,
    color: colors.textFaint,
  },
  dropdownSelectedText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  dropdownSearchInput: {
    height: 40,
    fontSize: fontSize.body,
    color: colors.text,
  },
  dropdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },
  remarksInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlignVertical: "top",
    marginTop: 6,
  },
  remarksText: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  thumbLg: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    marginTop: 6,
  },
  thumbContainer: {
    position: "relative",
    alignSelf: "flex-start",
  },
  ocrOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  uploadOverlay: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: "rgba(10,80,200,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: "rgba(10,80,200,0.12)",
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },

  // Sticky bar
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.card,
  },

  // Assign modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,26,46,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.h2, fontWeight: "700", color: colors.text },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
    color: colors.text,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "700" },
  techName: { fontSize: fontSize.body, fontWeight: "600", color: colors.text },
  techEmail: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  // Image viewer
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "85%" },
  viewerClose: {
    position: "absolute",
    top: 40,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Step Wizard
  stepHeader: {
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  stepBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTab: {
    alignItems: "center",
    flex: 1,
  },
  stepTabActive: {},
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  stepCircleDone: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brand,
  },
  stepCircleText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  stepCircleTextActive: {
    color: "#fff",
  },
  stepCircleTextDone: {
    color: colors.brand,
  },
  stepLabelText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  stepLabelTextActive: {
    color: colors.brand,
    fontWeight: "700",
  },
  stepConnector: {
    height: 2,
    flex: 0.4,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  stepConnectorActive: {
    backgroundColor: colors.brand,
  },
  stepNavRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
