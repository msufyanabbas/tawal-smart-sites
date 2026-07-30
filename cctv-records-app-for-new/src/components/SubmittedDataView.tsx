import { Image, TouchableOpacity, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import AppText from "../components/AppText";
import { Card } from "../components/ui";

import { SitesStackParamList } from "../navigation";
import { ImagedSerialTag, RmsScope, Site, SiteUnitsPayload } from "../types";

import { spacing } from "../theme";
import { styles } from "../utils/Styles";

type Rt = RouteProp<SitesStackParamList, "SiteDetail">;

interface UnitGroup {
  key: keyof SiteUnitsPayload;
  label: string;
  count: number;
  needs: { serial: boolean; tag: boolean };
}

const relevantUnitGroups = (site: Site): UnitGroup[] => {
  const out: UnitGroup[] = [];
  if (site.rmsScope === RmsScope.RMS) {
    out.push({
      key: "rmsUnits",
      label: "RMS Units",
      count: site.numberOfRms,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "expanderUnits",
      label: "Expanders",
      count: site.numberOfExpanders,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
    if (site.hasSmartLock) {
      out.push({
        key: "fenceLockUnits",
        label: "Fence Locks",
        count: site.numberOfFenceLocks,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "oduUnits",
        label: "ODUs",
        count: site.numberOfOdus,
        needs: { serial: true, tag: false },
      });
    }
    if (site.hasSmartMeter) {
      out.push({
        key: "smartMeterUnits",
        label: "Smart Meters",
        count: site.numberOfSmartMeters,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "ctSplitUnits",
        label: "CT Splits",
        count: site.numberOfCtSplits,
        needs: { serial: true, tag: true },
      });
    }
  } else if (site.rmsScope === RmsScope.SMART_LOCK) {
    out.push({
      key: "fenceLockUnits",
      label: "Fence Locks",
      count: site.numberOfFenceLocks,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "oduUnits",
      label: "ODUs",
      count: site.numberOfOdus,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SMART_METER) {
    out.push({
      key: "smartMeterUnits",
      label: "Smart Meters",
      count: site.numberOfSmartMeters,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "ctSplitUnits",
      label: "CT Splits",
      count: site.numberOfCtSplits,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "silboGatewayUnits",
      label: "Silbo Gateways",
      count: site.numberOfSilboGateways,
      needs: { serial: true, tag: true },
    });
    out.push({
      key: "simCards",
      label: "SIM Cards",
      count: site.numberOfSims,
      needs: { serial: true, tag: false },
    });
  } else if (site.rmsScope === RmsScope.SIM_SWAP) {
    if (site.hasSmartLock) {
      out.push({
        key: "fenceLockUnits",
        label: "Fence Locks",
        count: site.numberOfFenceLocks,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "oduUnits",
        label: "ODUs",
        count: site.numberOfOdus,
        needs: { serial: true, tag: false },
      });
    }
    if (site.hasSmartMeter) {
      out.push({
        key: "smartMeterUnits",
        label: "Smart Meters",
        count: site.numberOfSmartMeters,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "ctSplitUnits",
        label: "CT Splits",
        count: site.numberOfCtSplits,
        needs: { serial: true, tag: true },
      });
      out.push({
        key: "silboGatewayUnits",
        label: "Silbo Gateways",
        count: site.numberOfSilboGateways,
        needs: { serial: true, tag: true },
      });
    }
  }
  return out;
};
const SubmittedDataView: React.FC<{
  site: Site;
  onOpenImage: (uri: string) => void;
}> = ({ site, onOpenImage }) => {
  const groups = relevantUnitGroups(site)
    .map((g) => ({
      ...g,
      units: ((site as any)[g.key] as ImagedSerialTag[] | undefined) ?? [],
    }))
    .filter((g) => g.units.length > 0);

  const isSimSwap = site.rmsScope === RmsScope.SIM_SWAP;
  const hasSimSwapPairs = isSimSwap && (site.simSwapPairs?.length ?? 0) > 0;
  const hasTenants = isSimSwap && (site.simSwapTenants?.length ?? 0) > 0;
  const hasSimSwapFields =
    isSimSwap &&
    (site.simSwapSiteType ||
      site.simSwapComments ||
      hasSimSwapPairs ||
      hasTenants);

  // Check if there are material details to show
  const hasMaterialDetails =
    site?.materials?.numberOfRms > 0 ||
    site?.materials?.numberOfExpanders > 0 ||
    site?.materials?.numberOfSims > 0 ||
    site?.materials?.numberOfFenceLocks > 0 ||
    site?.materials?.numberOfShelterLocks > 0 ||
    site?.materials?.numberOfOdus > 0 ||
    site?.materials?.numberOfSmartMeters > 0 ||
    site?.materials?.numberOfCtSplits > 0 ||
    site?.materials?.numberOfSilboGateways > 0;

  const hasComments = !!site.simSwapComments;

  if (
    groups.length === 0 &&
    !hasSimSwapFields &&
    !hasMaterialDetails &&
    !hasComments
  ) {
    return (
      <Card>
        <AppText style={styles.muted}>
          The technician has not submitted any field data.
        </AppText>
      </Card>
    );
  }

  return (
    <>
      {/* Material Count */}
      {hasMaterialDetails && (
        <Card>
          <AppText style={styles.cardTitle}>Material Count</AppText>
          <View style={{ gap: spacing.sm }}>
            {site?.materials?.numberOfRms > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>RMS</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfRms)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfExpanders > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Expanders</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfExpanders)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfSims > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>SIMs</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfSims)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfFenceLocks > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Fence Locks</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfFenceLocks)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfShelterLocks > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Shelter Locks</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfShelterLocks)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfOdus > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>ODUs</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfOdus)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfSmartMeters > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Smart Meters</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfSmartMeters)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfCtSplits > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>CT Splits</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfCtSplits)}
                </AppText>
              </View>
            )}
            {site?.materials?.numberOfSilboGateways > 0 && (
              <View style={styles.dataRow}>
                <AppText style={styles.dataKey}>Silbo Gateways</AppText>
                <AppText style={styles.dataVal}>
                  {String(site?.materials?.numberOfSilboGateways)}
                </AppText>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Comments */}
      {hasComments && (
        <Card>
          <AppText style={styles.cardTitle}>Comments</AppText>
          <AppText style={[styles.dataVal, { textAlign: "left" }]}>
            {site.simSwapComments}
          </AppText>
        </Card>
      )}

      {hasSimSwapFields && (
        <Card>
          <AppText style={styles.cardTitle}>SIM Swap Details</AppText>

          {/* CT Main Photo */}
          {!!site.simSwapCtMainPhoto && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>CT Main Photo</AppText>
              <TouchableOpacity
                onPress={() => onOpenImage(site.simSwapCtMainPhoto!)}
                style={{ marginTop: spacing.xs }}
              >
                <Image
                  source={{ uri: site.simSwapCtMainPhoto }}
                  style={styles.thumbLg}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Meter Photo */}
          {!!site.simSwapMeterPhoto && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>Meter Photo</AppText>
              <TouchableOpacity
                onPress={() => onOpenImage(site.simSwapMeterPhoto!)}
                style={{ marginTop: spacing.xs }}
              >
                <Image
                  source={{ uri: site.simSwapMeterPhoto }}
                  style={styles.thumbLg}
                />
              </TouchableOpacity>
            </View>
          )}

          {!!site.simSwapSiteType && (
            <View style={{ marginBottom: spacing.sm }}>
              <AppText style={styles.dataKey}>Site Type</AppText>
              <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                {site.simSwapSiteType === "green_field"
                  ? "Green Field"
                  : "Roof Top"}
              </AppText>
            </View>
          )}

          {typeof site.simSwapLatitude === "number" &&
            typeof site.simSwapLongitude === "number" && (
              <View style={{ marginBottom: spacing.sm }}>
                <AppText style={styles.dataKey}>Location</AppText>
                <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                  Lat: {site.simSwapLatitude.toFixed(6)} | Lng:{" "}
                  {site.simSwapLongitude.toFixed(6)}
                </AppText>
              </View>
            )}

          {site.simSwapTenants && site.simSwapTenants.length > 0 && (
            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
              }}
            >
              <AppText style={styles.cardTitle}>Tenant Details</AppText>
              {site.simSwapTenants.map((t, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dataUnit,
                    {
                      backgroundColor: "#f8fafc",
                      padding: spacing.md,
                      borderRadius: 8,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <AppText
                    style={[
                      styles.unitHeading,
                      { fontSize: 13, marginBottom: spacing.xs },
                    ]}
                  >
                    Tenant #{idx + 1}
                  </AppText>
                  <View style={{ marginBottom: spacing.xs }}>
                    <AppText style={styles.dataKey}>Tenant Name</AppText>
                    <AppText style={[styles.dataVal, { textAlign: "left" }]}>
                      {t.tenantName || "Not specified"}
                    </AppText>
                  </View>
                  <View style={{ marginBottom: spacing.xs }}>
                    <AppText style={styles.dataKey}>Tenant CT Capacity</AppText>
                    {(() => {
                      const capacities = t.tenantCtCapacities ?? [];
                      const phasePhotos = t.ctPhasePhotos ?? [];
                      return [1, 2, 3].map((phaseNum) => (
                        <View
                          key={phaseNum}
                          style={{ marginBottom: spacing.sm }}
                        >
                          <AppText
                            style={[
                              styles.dataVal,
                              {
                                textAlign: "left",
                                fontSize: 13,
                                marginTop: spacing.xs / 2,
                              },
                            ]}
                          >
                            Phase #{phaseNum}:{" "}
                            {capacities[phaseNum - 1] || "Not specified"}
                          </AppText>
                          {!!phasePhotos[phaseNum - 1] && (
                            <TouchableOpacity
                              onPress={() =>
                                onOpenImage(phasePhotos[phaseNum - 1])
                              }
                              style={{ marginTop: spacing.xs }}
                            >
                              <Image
                                source={{ uri: phasePhotos[phaseNum - 1] }}
                                style={styles.thumbLg}
                              />
                              <AppText style={styles.thumbCaption}>
                                Phase #{phaseNum} photo
                              </AppText>
                            </TouchableOpacity>
                          )}
                        </View>
                      ));
                    })()}
                  </View>
                </View>
              ))}
            </View>
          )}

          {hasSimSwapPairs &&
            site.simSwapPairs!.map((pair, idx) => {
              const hasNew = !!pair.newSerialNumber || !!pair.newSerialImage;
              const hasOld = !!pair.oldSerialNumber || !!pair.oldSerialImage;
              return (
                <View key={idx} style={styles.dataUnit}>
                  <AppText style={styles.unitHeading}>
                    SIM Pair #{idx + 1}
                  </AppText>

                  {/* New SIM */}
                  <View style={{ marginTop: spacing.sm }}>
                    <AppText style={{ fontWeight: "600", marginBottom: 4 }}>
                      New SIM
                    </AppText>
                    {!hasNew ? (
                      <AppText style={styles.muted}>No data.</AppText>
                    ) : (
                      <>
                        {!!pair.newSerialNumber && (
                          <View style={styles.dataRow}>
                            <AppText style={styles.dataKey}>
                              Serial number
                            </AppText>
                            <AppText style={styles.dataVal}>
                              {pair.newSerialNumber}
                            </AppText>
                          </View>
                        )}
                        {!!pair.newSerialImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(pair.newSerialImage!)}
                            style={{ marginTop: spacing.xs }}
                          >
                            <Image
                              source={{ uri: pair.newSerialImage }}
                              style={styles.thumbLg}
                            />
                            <AppText style={styles.imgLabel}>Image</AppText>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>

                  {/* Old SIM */}
                  <View style={{ marginTop: spacing.sm }}>
                    <AppText style={{ fontWeight: "600", marginBottom: 4 }}>
                      Old SIM
                    </AppText>
                    {!hasOld ? (
                      <AppText style={styles.muted}>No data.</AppText>
                    ) : (
                      <>
                        {!!pair.oldSerialNumber && (
                          <View style={styles.dataRow}>
                            <AppText style={styles.dataKey}>
                              Serial number
                            </AppText>
                            <AppText style={styles.dataVal}>
                              {pair.oldSerialNumber}
                            </AppText>
                          </View>
                        )}
                        {!!pair.oldSerialImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(pair.oldSerialImage!)}
                            style={{ marginTop: spacing.xs }}
                          >
                            <Image
                              source={{ uri: pair.oldSerialImage }}
                              style={styles.thumbLg}
                            />
                            <AppText style={styles.imgLabel}>Image</AppText>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
        </Card>
      )}
      {groups.map((g) => {
        const singular = g.label.endsWith("s") ? g.label.slice(0, -1) : g.label;
        return (
          <Card key={g.key}>
            <AppText style={styles.cardTitle}>
              {g.label} ({g.units.length})
            </AppText>
            {g.units.map((u, idx) => {
              const hasAny =
                !!u.serialNumber ||
                !!u.serialImage ||
                !!u.tagNumber ||
                !!u.tagImage;
              return (
                <View key={idx} style={styles.dataUnit}>
                  <AppText style={styles.unitHeading}>
                    {singular} #{idx + 1}
                  </AppText>
                  {!hasAny ? (
                    <AppText style={styles.muted}>No data submitted.</AppText>
                  ) : (
                    <>
                      {!!u.serialNumber && (
                        <View style={styles.dataRow}>
                          <AppText style={styles.dataKey}>
                            Serial number
                          </AppText>
                          <AppText style={styles.dataVal}>
                            {u.serialNumber}
                          </AppText>
                        </View>
                      )}
                      {!!u.tagNumber && (
                        <View style={styles.dataRow}>
                          <AppText style={styles.dataKey}>Tag number</AppText>
                          <AppText style={styles.dataVal}>
                            {u.tagNumber}
                          </AppText>
                        </View>
                      )}
                      <View style={styles.thumbRow}>
                        {!!u.serialImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(u.serialImage!)}
                          >
                            <Image
                              source={{ uri: u.serialImage }}
                              style={styles.thumb}
                            />
                            <AppText style={styles.thumbCaption}>
                              Serial
                            </AppText>
                          </TouchableOpacity>
                        )}
                        {!!u.tagImage && (
                          <TouchableOpacity
                            onPress={() => onOpenImage(u.tagImage!)}
                          >
                            <Image
                              source={{ uri: u.tagImage }}
                              style={styles.thumb}
                            />
                            <AppText style={styles.thumbCaption}>Tag</AppText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </Card>
        );
      })}
    </>
  );
};
export default SubmittedDataView;
