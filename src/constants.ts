export const BARANGAYS = [
  "Bagbag",
  "Capri",
  "Fairview",
  "Greater Lagro",
  "Gulod",
  "Kaligayahan",
  "Nagkaisang Nayon",
  "North Fairview",
  "Novaliches Proper",
  "Pasong Putik Proper",
  "San Agustin",
  "San Bartolome",
  "Santa Lucia",
  "Santa Monica"
];

type CollectionType = 'Biodegradable' | 'Non-Biodegradable' | 'No Collection';

interface Schedule {
  biodegradable: string[];
  nonBiodegradable: string[];
  collectionTime: string;
}

const SCHEDULE_GROUPS: Record<string, Schedule> = {
  groupA: {
    biodegradable: ["Monday", "Wednesday", "Friday"],
    nonBiodegradable: ["Tuesday", "Thursday", "Saturday"],
    collectionTime: "7:30 AM - 9:00 AM"
  },
  groupB: {
    biodegradable: ["Tuesday", "Thursday", "Saturday"],
    nonBiodegradable: ["Monday", "Wednesday", "Friday"],
    collectionTime: "10:45 AM - 12:15 PM"
  },
  groupC: {
    biodegradable: ["Monday", "Tuesday", "Wednesday"],
    nonBiodegradable: ["Thursday", "Friday", "Saturday"],
    collectionTime: "2:15 PM - 3:45 PM"
  }
};

export const RECYCLE_INCENTIVE = {
  item: "Plastic Bottle",
  reward: "₱1.00 per bottle",
  description: "Turn your plastic waste into cash! Every clean plastic bottle (PET) surrendered to the mobile redemption center earns you 1 Peso."
};

const BARANGAY_TO_GROUP: Record<string, string> = {
  "Bagbag": "groupA",
  "Capri": "groupB",
  "Fairview": "groupA",
  "Greater Lagro": "groupC",
  "Gulod": "groupB",
  "Kaligayahan": "groupA",
  "Nagkaisang Nayon": "groupC",
  "North Fairview": "groupB",
  "Novaliches Proper": "groupA",
  "Pasong Putik Proper": "groupC",
  "San Agustin": "groupB",
  "San Bartolome": "groupA",
  "Santa Lucia": "groupC",
  "Santa Monica": "groupB"
};

export function getCollectionType(dayName: string, barangay: string): CollectionType {
  const groupKey = BARANGAY_TO_GROUP[barangay] || "groupA";
  const schedule = SCHEDULE_GROUPS[groupKey];

  if (schedule.biodegradable.includes(dayName)) return 'Biodegradable';
  if (schedule.nonBiodegradable.includes(dayName)) return 'Non-Biodegradable';
  return 'No Collection';
}

export function getWeeklySchedule(barangay: string): Schedule {
  const groupKey = BARANGAY_TO_GROUP[barangay] || "groupA";
  return SCHEDULE_GROUPS[groupKey];
}
