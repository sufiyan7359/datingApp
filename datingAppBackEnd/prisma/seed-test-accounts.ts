/**
 * Creates 10 male + 10 female fully-onboarded test accounts (complete profile,
 * 2 generated photos each) so discovery/swiping/matching/chat can all be
 * exercised without manually filling in 20 profiles by hand.
 *
 * Run from datingAppBackEnd/: npx ts-node prisma/seed-test-accounts.ts
 * All accounts share the password: Passw0rd1
 */
import { Gender, LifestyleChoice, PrismaClient, RelationshipGoal } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const prisma = new PrismaClient();

const PASSWORD_SALT_ROUNDS = 12;
const TEST_PASSWORD = 'Passw0rd1';
const PHOTOS_ROOT = join(process.cwd(), 'uploads', 'photos');

interface SeedProfile {
  firstName: string;
  lastName: string;
  gender: Gender;
  interestedIn: Gender[];
  age: number;
  city: string;
  country: string;
  lat: number;
  lng: number;
  bio: string;
  profession: string;
  education: string;
  religion: string;
  languages: string[];
  relationshipGoal: RelationshipGoal;
  smoking: LifestyleChoice;
  drinking: LifestyleChoice;
  workout: LifestyleChoice;
  interests: string[];
  hasKids: boolean;
  wantsKids: boolean;
  hasPets: boolean;
  colors: [string, string];
}

const L = LifestyleChoice;
const G = RelationshipGoal;

const MALES: SeedProfile[] = [
  { firstName: 'Arjun', lastName: 'Mehta', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 27, city: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, bio: 'Software engineer by day, weekend trekker. Looking for someone to explore the city with.', profession: 'Software Engineer', education: 'B.Tech, IIT Bombay', religion: 'Hindu', languages: ['English', 'Hindi', 'Marathi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.REGULARLY, interests: ['Trekking', 'Coffee', 'Cricket', 'Reading'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#3b82f6', '#2563eb'] },
  { firstName: 'Rohan', lastName: 'Sharma', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 30, city: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, bio: 'Chef who loves experimenting with fusion cuisine. Foodie at heart, gym rat by habit.', profession: 'Chef', education: 'Diploma in Culinary Arts', religion: 'Hindu', languages: ['English', 'Hindi', 'Punjabi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.REGULARLY, interests: ['Cooking', 'Foodie', 'Fitness', 'Travel'], hasKids: false, wantsKids: true, hasPets: true, colors: ['#f97316', '#ea580c'] },
  { firstName: 'Vikram', lastName: 'Singh', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 33, city: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873, bio: 'Architect who sketches old forts on weekends. Big fan of history and heritage walks.', profession: 'Architect', education: 'B.Arch, SPA Delhi', religion: 'Sikh', languages: ['English', 'Hindi', 'Punjabi'], relationshipGoal: G.NOT_SURE, smoking: L.NEVER, drinking: L.NEVER, workout: L.SOMETIMES, interests: ['Art', 'History', 'Photography', 'Travel'], hasKids: false, wantsKids: false, hasPets: false, colors: ['#8b5cf6', '#7c3aed'] },
  { firstName: 'Karan', lastName: 'Malhotra', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 26, city: 'Chandigarh', country: 'India', lat: 30.7333, lng: 76.7794, bio: 'Marketing manager, cricket obsessed, and always up for a road trip.', profession: 'Marketing Manager', education: 'MBA, IIM Ahmedabad', religion: 'Hindu', languages: ['English', 'Hindi'], relationshipGoal: G.CASUAL, smoking: L.SOMETIMES, drinking: L.REGULARLY, workout: L.SOMETIMES, interests: ['Cricket', 'Road trips', 'Music', 'Movies'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#10b981', '#059669'] },
  { firstName: 'Aditya', lastName: 'Verma', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 29, city: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567, bio: 'Data analyst who spends more time on hiking trails than spreadsheets, if given a choice.', profession: 'Data Analyst', education: 'M.Sc Statistics', religion: 'Hindu', languages: ['English', 'Hindi', 'Marathi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.REGULARLY, interests: ['Hiking', 'Yoga', 'Reading', 'Coffee'], hasKids: false, wantsKids: true, hasPets: true, colors: ['#14b8a6', '#0d9488'] },
  { firstName: 'Farhan', lastName: 'Ali', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 31, city: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867, bio: 'Pilot, always chasing sunsets from 30,000 feet. Grounded and easygoing otherwise.', profession: 'Pilot', education: 'Commercial Pilot License', religion: 'Muslim', languages: ['English', 'Urdu', 'Hindi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.NEVER, workout: L.SOMETIMES, interests: ['Travel', 'Photography', 'Fitness', 'Food'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#0ea5e9', '#0284c7'] },
  { firstName: 'Rahul', lastName: 'Nair', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 28, city: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673, bio: 'Product manager who codes on the side. Beach person, terrible at cooking.', profession: 'Product Manager', education: 'B.Tech, NIT Calicut', religion: 'Hindu', languages: ['English', 'Malayalam', 'Hindi'], relationshipGoal: G.SHORT_TERM, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.SOMETIMES, interests: ['Gaming', 'Beaches', 'Tech', 'Music'], hasKids: false, wantsKids: false, hasPets: false, colors: ['#ef4444', '#dc2626'] },
  { firstName: 'Siddharth', lastName: 'Rao', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 34, city: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946, bio: 'Entrepreneur running a small design studio. Weekends are for football and biryani.', profession: 'Entrepreneur', education: 'B.Des, NID', religion: 'Hindu', languages: ['English', 'Kannada', 'Telugu'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.REGULARLY, interests: ['Football', 'Design', 'Startups', 'Food'], hasKids: true, wantsKids: true, hasPets: true, colors: ['#f59e0b', '#d97706'] },
  { firstName: 'Zaid', lastName: 'Khan', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 25, city: 'Lucknow', country: 'India', lat: 26.8467, lng: 80.9462, bio: 'Journalist covering city culture. Always got a story and a cup of chai ready.', profession: 'Journalist', education: 'MA Journalism', religion: 'Muslim', languages: ['English', 'Urdu', 'Hindi'], relationshipGoal: G.NOT_SURE, smoking: L.SOMETIMES, drinking: L.NEVER, workout: L.NEVER, interests: ['Writing', 'History', 'Chai', 'Cinema'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#84cc16', '#65a30d'] },
  { firstName: 'Aryan', lastName: 'Kapoor', gender: Gender.MALE, interestedIn: [Gender.FEMALE], age: 24, city: 'Indore', country: 'India', lat: 22.7196, lng: 75.8577, bio: 'Fitness trainer and part-time musician. Life is better with a good playlist and a good workout.', profession: 'Fitness Trainer', education: 'BSc Sports Science', religion: 'Hindu', languages: ['English', 'Hindi'], relationshipGoal: G.CASUAL, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.REGULARLY, interests: ['Fitness', 'Music', 'Dancing', 'Travel'], hasKids: false, wantsKids: false, hasPets: false, colors: ['#ec4899', '#db2777'] },
];

const FEMALES: SeedProfile[] = [
  { firstName: 'Priya', lastName: 'Iyer', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 26, city: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, bio: 'Doctor who loves classical dance in her free time. Looking for genuine conversations.', profession: 'Doctor', education: 'MBBS', religion: 'Hindu', languages: ['English', 'Tamil', 'Hindi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.NEVER, workout: L.SOMETIMES, interests: ['Dancing', 'Reading', 'Music', 'Yoga'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#f43f5e', '#e11d48'] },
  { firstName: 'Ananya', lastName: 'Gupta', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 28, city: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, bio: 'Lawyer with a weakness for street food and old Bollywood songs.', profession: 'Lawyer', education: 'LLB, NLU Delhi', religion: 'Hindu', languages: ['English', 'Hindi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.SOMETIMES, interests: ['Foodie', 'Movies', 'Music', 'Travel'], hasKids: false, wantsKids: true, hasPets: true, colors: ['#a855f7', '#9333ea'] },
  { firstName: 'Sneha', lastName: 'Reddy', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 25, city: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867, bio: 'Graphic designer, plant mom, and amateur baker. Send memes, not just hi.', profession: 'Graphic Designer', education: 'B.Des', religion: 'Hindu', languages: ['English', 'Telugu', 'Hindi'], relationshipGoal: G.NOT_SURE, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.NEVER, interests: ['Art', 'Baking', 'Plants', 'Design'], hasKids: false, wantsKids: false, hasPets: true, colors: ['#06b6d4', '#0891b2'] },
  { firstName: 'Kavya', lastName: 'Menon', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 29, city: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673, bio: 'Marine biologist who is obsessed with the ocean. Will talk your ear off about coral reefs.', profession: 'Marine Biologist', education: 'PhD Marine Biology', religion: 'Hindu', languages: ['English', 'Malayalam'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.NEVER, workout: L.REGULARLY, interests: ['Ocean', 'Diving', 'Travel', 'Science'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#22c55e', '#16a34a'] },
  { firstName: 'Riya', lastName: 'Kapoor', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 27, city: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, bio: 'Fashion designer who lives for good coffee and rainy days. Dog mom to a golden retriever.', profession: 'Fashion Designer', education: 'B.Des, NIFT', religion: 'Hindu', languages: ['English', 'Hindi', 'Marathi'], relationshipGoal: G.CASUAL, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.SOMETIMES, interests: ['Fashion', 'Coffee', 'Dogs', 'Art'], hasKids: false, wantsKids: false, hasPets: true, colors: ['#eab308', '#ca8a04'] },
  { firstName: 'Neha', lastName: 'Joshi', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 31, city: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567, bio: 'Civil engineer building bridges by day, painting landscapes by night.', profession: 'Civil Engineer', education: 'B.E. Civil', religion: 'Hindu', languages: ['English', 'Hindi', 'Marathi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.NEVER, workout: L.SOMETIMES, interests: ['Painting', 'Trekking', 'Reading', 'Yoga'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#6366f1', '#4f46e5'] },
  { firstName: 'Fatima', lastName: 'Sheikh', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 26, city: 'Lucknow', country: 'India', lat: 26.8467, lng: 80.9462, bio: 'Dentist who loves poetry and old Urdu literature. Looking for someone who can hold a conversation.', profession: 'Dentist', education: 'BDS', religion: 'Muslim', languages: ['English', 'Urdu', 'Hindi'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.NEVER, workout: L.NEVER, interests: ['Poetry', 'Reading', 'Cinema', 'Chai'], hasKids: false, wantsKids: true, hasPets: false, colors: ['#d946ef', '#c026d3'] },
  { firstName: 'Meera', lastName: 'Nair', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 24, city: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946, bio: 'Musician and part-time software tester. Will probably talk about my guitar more than my job.', profession: 'Musician', education: 'BA Music', religion: 'Hindu', languages: ['English', 'Malayalam', 'Kannada'], relationshipGoal: G.SHORT_TERM, smoking: L.SOMETIMES, drinking: L.SOMETIMES, workout: L.NEVER, interests: ['Music', 'Guitar', 'Gigs', 'Coffee'], hasKids: false, wantsKids: false, hasPets: false, colors: ['#f97316', '#c2410c'] },
  { firstName: 'Isha', lastName: 'Bansal', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 30, city: 'Chandigarh', country: 'India', lat: 30.7333, lng: 76.7794, bio: 'Journalist covering politics, but honestly just here for good food recommendations.', profession: 'Journalist', education: 'MA Journalism', religion: 'Hindu', languages: ['English', 'Hindi', 'Punjabi'], relationshipGoal: G.NOT_SURE, smoking: L.NEVER, drinking: L.SOMETIMES, workout: L.SOMETIMES, interests: ['Foodie', 'Writing', 'Travel', 'Politics'], hasKids: false, wantsKids: true, hasPets: true, colors: ['#3b82f6', '#1d4ed8'] },
  { firstName: 'Divya', lastName: 'Pillai', gender: Gender.FEMALE, interestedIn: [Gender.MALE], age: 32, city: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, bio: 'Nurse with a big heart and a bigger sweet tooth. Weekends are for temple runs and Netflix.', profession: 'Nurse', education: 'B.Sc Nursing', religion: 'Hindu', languages: ['English', 'Tamil'], relationshipGoal: G.LONG_TERM, smoking: L.NEVER, drinking: L.NEVER, workout: L.SOMETIMES, interests: ['Movies', 'Cooking', 'Family', 'Travel'], hasKids: true, wantsKids: true, hasPets: false, colors: ['#10b981', '#047857'] },
];

async function makePhotoBuffer(color: string, initials: string): Promise<Buffer> {
  const svg = `
    <svg width="640" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="800" fill="${color}"/>
      <circle cx="320" cy="330" r="150" fill="rgba(255,255,255,0.18)"/>
      <text x="320" y="378" font-family="Arial, Helvetica, sans-serif" font-size="150" fill="#ffffff" text-anchor="middle" font-weight="bold">${initials}</text>
    </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

function randomDateOfBirth(age: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(1 + Math.floor(Math.random() * 27));
  return date;
}

async function createTestUser(p: SeedProfile, index: number): Promise<string> {
  const email = `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}${index}@example.com`;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Skipping ${email} (already exists)`);
    return existing.id;
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName: p.firstName, lastName: p.lastName },
  });

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      gender: p.gender,
      interestedIn: p.interestedIn,
      dateOfBirth: randomDateOfBirth(p.age),
      religion: p.religion,
      languages: p.languages,
      profession: p.profession,
      education: p.education,
      bio: p.bio,
      city: p.city,
      country: p.country,
      latitude: p.lat,
      longitude: p.lng,
      smoking: p.smoking,
      drinking: p.drinking,
      workout: p.workout,
      relationshipGoal: p.relationshipGoal,
      hasKids: p.hasKids,
      wantsKids: p.wantsKids,
      hasPets: p.hasPets,
      interests: p.interests,
      onboardingCompleted: true,
    },
  });

  const dir = join(PHOTOS_ROOT, user.id);
  mkdirSync(dir, { recursive: true });
  const initials = `${p.firstName[0]}${p.lastName[0]}`.toUpperCase();

  for (let i = 0; i < p.colors.length; i++) {
    const filename = `${randomUUID()}.jpg`;
    const buffer = await makePhotoBuffer(p.colors[i], initials);
    writeFileSync(join(dir, filename), buffer);
    await prisma.photo.create({
      data: {
        profileId: profile.id,
        url: `/uploads/photos/${user.id}/${filename}`,
        order: i,
        isPrimary: i === 0,
        isBlurred: false,
      },
    });
  }

  console.log(`Created ${p.gender.padEnd(6)} ${p.firstName} ${p.lastName} <${email}>`);
  return user.id;
}

async function createMatch(userId1: string, userId2: string, messages: Array<{ from: string; text: string }>) {
  const [userAId, userBId] = [userId1, userId2].sort();

  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });

  const conversation = await prisma.conversation.upsert({
    where: { matchId: match.id },
    update: {},
    create: { matchId: match.id },
  });

  for (const m of messages) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: m.from,
        type: 'TEXT',
        content: m.text,
        deliveredAt: new Date(),
      },
    });
  }
}

async function main() {
  const maleIds: string[] = [];
  const femaleIds: string[] = [];

  for (let i = 0; i < MALES.length; i++) {
    maleIds.push(await createTestUser(MALES[i], i + 1));
  }
  for (let i = 0; i < FEMALES.length; i++) {
    femaleIds.push(await createTestUser(FEMALES[i], i + 1));
  }

  // A few pre-made matches with starter messages so Matches/Messages pages
  // have real content to test without manually swiping both sides first.
  await createMatch(maleIds[0], femaleIds[0], [
    { from: maleIds[0], text: `Hey ${FEMALES[0].firstName}! Loved your profile 😊` },
    { from: femaleIds[0], text: `Hi ${MALES[0].firstName}! Thank you, yours too - trekking trips sound fun.` },
  ]);
  await createMatch(maleIds[1], femaleIds[1], [
    { from: femaleIds[1], text: 'Hey there! How was your week?' },
  ]);
  await createMatch(maleIds[2], femaleIds[2], []);

  console.log('\nDone. 10 male + 10 female test accounts are ready.');
  console.log('All of them log in with password: Passw0rd1\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
