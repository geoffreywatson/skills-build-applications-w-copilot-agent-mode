import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Suggestion = { title: string; reason?: string };

async function loadSuggestions() {
  return (await getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`)).suggestions;
}

export default function Workouts() {
  return <CapabilityCard
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyMessage="No workout suggestions available."
    load={loadSuggestions}
    renderItem={(suggestion) => <><strong>{suggestion.title}</strong>{suggestion.reason && <p className="mb-0">{suggestion.reason}</p>}</>}
  />;
}
