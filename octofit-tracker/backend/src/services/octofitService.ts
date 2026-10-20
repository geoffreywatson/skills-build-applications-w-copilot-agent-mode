import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw badRequest('Activity details are required');
  }

  const { userId, teamId, type, minutes, occurredAt } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    !/^[\da-f]{24}$/i.test(userId) ||
    typeof teamId !== 'string' ||
    !/^[\da-f]{24}$/i.test(teamId)
  ) {
    throw badRequest('Valid userId and teamId are required');
  }
  if (typeof type !== 'string' || !type.trim()) {
    throw badRequest('Activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw badRequest('Activity minutes must be at least 1');
  }

  const occurredAtDate = occurredAt === undefined ? new Date() : new Date(typeof occurredAt === 'string' ? occurredAt : NaN);
  if (Number.isNaN(occurredAtDate.getTime())) {
    throw badRequest('A valid occurredAt date is required');
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw badRequest('The referenced user and team must exist');
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: occurredAtDate,
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw badRequest('Team details are required');
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()) {
    throw badRequest('Team name and mascot are required');
  }
  if (
    !Array.isArray(members) ||
    members.some((member) => typeof member !== 'string' || !/^[\da-f]{24}$/i.test(member))
  ) {
    throw badRequest('Team members must be valid user IDs');
  }

  const memberIds = [...new Set(members as string[])];
  if (memberIds.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (existingMembers !== memberIds.length) {
      throw badRequest('All team members must exist');
    }
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $sort: { totalPoints: -1, 'team.name': 1 } },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);

  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const activities = await Activity.find({ user: user._id }).distinct('type');
  const activityFocuses = activities.map((type) => {
    switch (type.toLowerCase()) {
      case 'run':
      case 'cycle':
      case 'walk':
        return 'endurance';
      case 'strength':
      case 'weightlifting':
        return 'strength';
      default:
        return type.toLowerCase();
    }
  });
  const preferredFocuses = [...new Set([user.fitnessGoal.toLowerCase(), ...activityFocuses])];
  const workouts = await Workout.find().lean();
  const matching = workouts.filter((workout) => preferredFocuses.includes(workout.focus.toLowerCase()));
  const suggestions = matching.length > 0 ? matching : workouts;

  return suggestions.map((workout) => ({
    ...workout,
    reason: preferredFocuses.includes(workout.focus.toLowerCase())
      ? `Matches your ${workout.focus} goal and activity pattern.`
      : `Suggested based on your activity pattern.`,
  }));
}

export { User };
