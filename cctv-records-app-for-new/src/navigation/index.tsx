import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import FlashScreen from '../screens/FlashScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPassword';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import SiteDetailScreen from '../screens/SiteDetailScreen';
import AddSiteScreen from '../screens/AddSiteScreen';
import EditSiteScreen from '../screens/EditSiteScreen';
import UsersScreen from '../screens/UsersScreen';
import ReportsScreen from '../screens/ReportsScreen';

import CustomHeader from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { colors } from '../theme';

// ── Param lists ────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Flash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ChangePassword: { token?: string };
};

// Each tab hosts its own native-stack so headers and back navigation behave
// per-tab. Sites/MySites tab nests the list → detail → add → edit flow.
// The list accepts an optional region pre-filter (used by the dashboard's
// region drill-down cards).
export type SitesStackParamList = {
  SitesList: { region?: string } | undefined;
  SiteDetail: { siteId: string };
  AddSite: undefined;
  EditSite: { siteId: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  SiteDetail: { siteId: string };
};

export type UsersStackParamList = {
  UsersList: undefined;
};

export type ReportsStackParamList = {
  ReportsHome: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  SitesTab: undefined;
  UsersTab: undefined;
  ReportsTab: undefined;
};

// Legacy alias kept so older imports (e.g. SiteDetailScreen referencing
// `MainStackParamList`) still type-check.
export type MainStackParamList = SitesStackParamList & {
  Dashboard: undefined;
  Home: undefined;
  Users: undefined;
  Reports: undefined;
};

// ── Auth ───────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => (
  <AuthStack.Navigator
    id={undefined}
    screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </AuthStack.Navigator>
);

// ── Stack-per-tab helpers ──────────────────────────────────────────────────

// Wrap the header so its return type satisfies Navigation v7's `ReactElement`
// expectation under React 19's stricter ReactNode typing.
const sharedStackOptions = {
  header: (props: any) => <CustomHeader {...props} />,
  contentStyle: { backgroundColor: colors.bg },
} as const;

const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const DashboardNavigator: React.FC = () => (
  <DashboardStack.Navigator id={undefined} screenOptions={sharedStackOptions}>
    <DashboardStack.Screen
      name="DashboardHome"
      component={DashboardScreen}
      options={{ title: 'Dashboard' }}
    />
    <DashboardStack.Screen
      name="SiteDetail"
      component={SiteDetailScreen}
      options={{ title: 'Site Detail' }}
    />
  </DashboardStack.Navigator>
);

const SitesStack = createNativeStackNavigator<SitesStackParamList>();
const SitesNavigator: React.FC<{ titleOnList: string }> = ({ titleOnList }) => (
  <SitesStack.Navigator id={undefined} screenOptions={sharedStackOptions}>
    <SitesStack.Screen
      name="SitesList"
      component={HomeScreen}
      options={{ title: titleOnList }}
    />
    <SitesStack.Screen
      name="SiteDetail"
      component={SiteDetailScreen}
      options={{ title: 'Site Detail' }}
    />
    <SitesStack.Screen
      name="AddSite"
      component={AddSiteScreen}
      options={{ title: 'New Site' }}
    />
    <SitesStack.Screen
      name="EditSite"
      component={EditSiteScreen}
      options={{ title: 'Edit Site' }}
    />
  </SitesStack.Navigator>
);

const UsersStack = createNativeStackNavigator<UsersStackParamList>();
const UsersNavigator: React.FC = () => (
  <UsersStack.Navigator id={undefined} screenOptions={sharedStackOptions}>
    <UsersStack.Screen name="UsersList" component={UsersScreen} options={{ title: 'Users' }} />
  </UsersStack.Navigator>
);

const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();
const ReportsNavigator: React.FC = () => (
  <ReportsStack.Navigator id={undefined} screenOptions={sharedStackOptions}>
    <ReportsStack.Screen name="ReportsHome" component={ReportsScreen} options={{ title: 'Reports' }} />
  </ReportsStack.Navigator>
);

// ── Tabs ───────────────────────────────────────────────────────────────────

const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} size={size} color={color} />;

const MainTabs: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === Role.ADMIN;
  const isManager = role === Role.MANAGER;
  const isTech = role === Role.TECHNICIAN;

  return (
    <Tabs.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.border,
          paddingTop: 4,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="DashboardTab"
        component={DashboardNavigator}
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('home-outline') }}
      />

      <Tabs.Screen
        name="SitesTab"
        options={{
          title: isTech ? 'My Sites' : 'Sites',
          tabBarIcon: tabIcon('business-outline'),
        }}
      >
        {() => <SitesNavigator titleOnList={isTech ? 'My Sites' : 'Sites'} />}
      </Tabs.Screen>

      {isAdmin && (
        <Tabs.Screen
          name="UsersTab"
          component={UsersNavigator}
          options={{ title: 'Users', tabBarIcon: tabIcon('people-outline') }}
        />
      )}

      {(isAdmin || isManager) && (
        <Tabs.Screen
          name="ReportsTab"
          component={ReportsNavigator}
          options={{ title: 'Reports', tabBarIcon: tabIcon('document-text-outline') }}
        />
      )}
    </Tabs.Navigator>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();

const AppNavigation: React.FC = () => {
  const { isLoading, isLoggedIn } = useAuth();

  return (
    <NavigationContainer>
      <RootStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {isLoading ? (
          <RootStack.Screen name="Flash" component={FlashScreen} />
        ) : isLoggedIn ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;

// Helper types for typed BottomTabScreenProps — exported for screens that
// need them.
export type DashboardTabProps = BottomTabScreenProps<MainTabParamList, 'DashboardTab'>;
