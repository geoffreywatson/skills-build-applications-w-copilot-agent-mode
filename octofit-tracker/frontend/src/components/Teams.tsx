import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Team = { name: string; members?: string[] };

async function loadTeams() {
  return (await getJson<{ teams: Team[] }>('/api/teams')).teams;
}

export default function Teams() {
  return <CapabilityCard
    title="Teams"
    description="Manage teams and members."
    emptyMessage="No teams found."
    load={loadTeams}
    renderItem={(team) => <>{team.name} ({team.members?.length ?? 0} members)</>}
  />;
}
