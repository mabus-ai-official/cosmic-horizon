import { useState, useEffect } from "react";
import { getSyndicate } from "../services/api";
import SyndicateOverviewPanel from "./SyndicateOverviewPanel";
import SyndicateEconomyPanel from "./SyndicateEconomyPanel";
import SyndicateProjectsPanel from "./SyndicateProjectsPanel";
import SyndicateStructuresPanel from "./SyndicateStructuresPanel";
import GovernanceTab from "./GovernanceTab";
import SyndicateAdminTab from "./SyndicateAdminTab";

interface Props {
  refreshKey?: number;
  onCommand: (cmd: string) => void;
  bare?: boolean;
}

type TabView =
  | "overview"
  | "governance"
  | "economy"
  | "projects"
  | "structures"
  | "admin";

export default function SyndicateGroupPanel({
  refreshKey,
  onCommand,
  bare,
}: Props) {
  const [tab, setTab] = useState<TabView>("overview");
  const [syndicateData, setSyndicateData] = useState<any>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    getSyndicate()
      .then(({ data }) => setSyndicateData(data))
      .catch(() => setSyndicateData(null));
  }, [refreshKey, internalRefresh]);

  const triggerRefresh = () => setInternalRefresh((r) => r + 1);

  const syndicateId = syndicateData?.id;
  const members = syndicateData?.members || [];
  const isLeader =
    syndicateData?.leaderId &&
    members.some(
      (m: any) => m.id === syndicateData.leaderId && m.role === "leader",
    );

  // Determine if current player is leader or officer for admin visibility
  // We don't have player ID here directly, so we check all members for leader/officer roles
  const showAdmin = syndicateData != null; // Show admin tab for all members in a syndicate; permissions checked inside

  const baseTabs: { key: TabView; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "governance", label: "Governance" },
    { key: "economy", label: "Economy" },
    { key: "projects", label: "Projects" },
    { key: "structures", label: "Structures" },
  ];

  const tabs = showAdmin
    ? [...baseTabs, { key: "admin" as TabView, label: "Admin" }]
    : baseTabs;

  // If not in a syndicate, only show overview
  const activeTabs = syndicateData
    ? tabs
    : [{ key: "overview" as TabView, label: "Overview" }];

  const tabBar = (
    <div className="group-panel-tabs">
      {activeTabs.map((t, i) => (
        <span key={t.key}>
          {i > 0 && (
            <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
          )}
          <span
            onClick={() => setTab(t.key)}
            style={{
              cursor: "pointer",
              color: tab === t.key ? "#0f0" : "#666",
            }}
          >
            {tab === t.key ? `[${t.label}]` : t.label}
          </span>
        </span>
      ))}
    </div>
  );

  const effectiveKey = (refreshKey || 0) + internalRefresh;

  const content = (
    <>
      {tabBar}
      {tab === "overview" && (
        <SyndicateOverviewPanel
          refreshKey={effectiveKey}
          onCommand={onCommand}
          bare
          onRefresh={triggerRefresh}
        />
      )}
      {tab === "governance" && syndicateId && (
        <GovernanceTab
          syndicateId={syndicateId}
          refreshKey={effectiveKey}
          bare
        />
      )}
      {tab === "economy" && (
        <SyndicateEconomyPanel refreshKey={effectiveKey} bare />
      )}
      {tab === "projects" && (
        <SyndicateProjectsPanel
          refreshKey={effectiveKey}
          onCommand={onCommand}
          bare
        />
      )}
      {tab === "structures" && (
        <SyndicateStructuresPanel refreshKey={effectiveKey} bare />
      )}
      {tab === "admin" && syndicateId && (
        <SyndicateAdminTab
          syndicateId={syndicateId}
          members={members}
          isLeader={!!isLeader}
          refreshKey={effectiveKey}
          onRefresh={triggerRefresh}
        />
      )}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
