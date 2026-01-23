import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Default Income Categories for Church
export const defaultIncomeCategories = [
  {
    order: 0,
    name: "BUILDING ACCOUNT",
    category: "BUILDING ACCOUNT",
    subCategory: "MEMBER CONTRIBUTION",
    description: "MEMBER CONTRIBUTION",
    includeInContributionReport: "Yes"
  },
  {
    order: 26,
    name: "CDs and Books",
    category: "CDs and Books",
    subCategory: "CDs and Books Sale",
    description: "CDs and Books Sale",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Vicar Transfer",
    description: "Vicar Transfer",
    includeInContributionReport: "Yes"
  },
  {
    order: 30,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Annual Convention Offry",
    description: "Annual Convention Offry",
    includeInContributionReport: "No"
  },
  {
    order: 31,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Annual Picnic",
    description: "Annual Picnic",
    includeInContributionReport: "No"
  },
  {
    order: 32,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Christmas Breakfast",
    description: "Christmas Breakfast",
    includeInContributionReport: "Yes"
  },
  {
    order: 33,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Christmas Carol",
    description: "Christmas Carol",
    includeInContributionReport: "Yes"
  },
  {
    order: 34,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Easter Breakfast",
    description: "Easter Breakfast",
    includeInContributionReport: "Yes"
  },
  {
    order: 35,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Family Sunday",
    description: "Family Sunday",
    includeInContributionReport: "Yes"
  },
  {
    order: 37,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Good Friday",
    description: "Good Friday",
    includeInContributionReport: "Yes"
  },
  {
    order: 38,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Harvest Festival",
    description: "Harvest Festival",
    includeInContributionReport: "Yes"
  },
  {
    order: 39,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Parish Day",
    description: "Parish Day",
    includeInContributionReport: "No"
  },
  {
    order: 40,
    name: "CHURCH SPL. PROGRAMS",
    category: "CHURCH SPL. PROGRAMS",
    subCategory: "Thanks Giving",
    description: "Thanks Giving",
    includeInContributionReport: "Yes"
  },
  {
    order: 50,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "Good Samaritan Fund",
    description: "Good Samaritan Fund",
    includeInContributionReport: "Yes"
  },
  {
    order: 51,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "St. Paul Mission Proj.",
    description: "St. Paul Mission Proj.",
    includeInContributionReport: "Yes"
  },
  {
    order: 52,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "Light to Life",
    description: "Light to Life",
    includeInContributionReport: "Yes"
  },
  {
    order: 20,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Diocesan Day Collection",
    description: "Diocesan Day Collection",
    includeInContributionReport: "Yes"
  },
  {
    order: 21,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Other",
    description: "Other",
    includeInContributionReport: "Yes"
  },
  {
    order: 22,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Suvisesha Nidhi",
    description: "Suvisesha Nidhi",
    includeInContributionReport: "Yes"
  },
  {
    order: 23,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Diocesan Dev. Fund",
    description: "Diocesan Dev. Fund",
    includeInContributionReport: "Yes"
  },
  {
    order: 414,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Diocesan Remittance",
    description: "Diocesan Remittance",
    includeInContributionReport: "Yes"
  },
  {
    order: 11,
    name: "DONATIONS",
    category: "DONATIONS",
    subCategory: "Baptism",
    description: "Baptism",
    includeInContributionReport: "No"
  },
  {
    order: 12,
    name: "DONATIONS",
    category: "DONATIONS",
    subCategory: "Marriage",
    description: "Marriage",
    includeInContributionReport: "No"
  },
  {
    order: 13,
    name: "DONATIONS",
    category: "DONATIONS",
    subCategory: "General",
    description: "General",
    includeInContributionReport: "Yes"
  },
  {
    order: 14,
    name: "DONATIONS",
    category: "DONATIONS",
    subCategory: "Other",
    description: "Other",
    includeInContributionReport: "Yes"
  },
  {
    order: 0,
    name: "FIRST COMMUNION",
    category: "FIRST COMMUNION",
    subCategory: "FIRST COMMUNION INCOME",
    description: "FIRST COMMUNION INCOME",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "Lighted to Life",
    category: "Lighted to Life",
    subCategory: "VOID",
    description: "VOID",
    includeInContributionReport: "No"
  },
  {
    order: 2,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "General",
    description: "General",
    includeInContributionReport: "No"
  },
  {
    order: 3,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Birthday",
    description: "Birthday",
    includeInContributionReport: "Yes"
  },
  {
    order: 4,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Wedding Anniversary",
    description: "Wedding Anniversary",
    includeInContributionReport: "Yes"
  },
  {
    order: 5,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Baptism",
    description: "Baptism",
    includeInContributionReport: "No"
  },
  {
    order: 6,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Marriage",
    description: "Marriage",
    includeInContributionReport: "No"
  },
  {
    order: 7,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Vidhyarambam",
    description: "Vidhyarambam",
    includeInContributionReport: "Yes"
  },
  {
    order: 8,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "World Sunday School",
    description: "World Sunday School",
    includeInContributionReport: "No"
  },
  {
    order: 8,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Palm Sunday",
    description: "Palm Sunday",
    includeInContributionReport: "No"
  },
  {
    order: 9,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Palm Sunday",
    description: "Palm Sunday",
    includeInContributionReport: "No"
  },
  {
    order: 9,
    name: "OFFERTORY",
    category: "OFFERTORY",
    subCategory: "Good Friday",
    description: "Good Friday",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "KECF",
    description: "KECF",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Church Carnival",
    description: "Church Carnival",
    includeInContributionReport: "Yes"
  },
  {
    order: 36,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Family Retreat",
    description: "Family Retreat",
    includeInContributionReport: "Yes"
  },
  {
    order: 55,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Church Facilities",
    description: "Church Facilities",
    includeInContributionReport: "No"
  },
  {
    order: 56,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Claims/Refund/Credit",
    description: "Claims/Refund/Credit",
    includeInContributionReport: "No"
  },
  {
    order: 58,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Bank Transfer",
    description: "Bank Transfer",
    includeInContributionReport: "No"
  },
  {
    order: 59,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Rent",
    description: "Rent",
    includeInContributionReport: "No"
  },
  {
    order: 60,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Pass Thru Items",
    description: "Pass Thru Items",
    includeInContributionReport: "Yes"
  },
  {
    order: 61,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "House Keeping",
    description: "House Keeping",
    includeInContributionReport: "No"
  },
  {
    order: 62,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Miscellaneous",
    description: "Miscellaneous",
    includeInContributionReport: "Yes"
  },
  {
    order: 63,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Altar Flowers",
    description: "Altar Flowers",
    includeInContributionReport: "No"
  },
  {
    order: 97,
    name: "OTHER INCOME",
    category: "OTHER INCOME",
    subCategory: "Wayanad Relief Fund",
    description: "Wayanad Relief Fund",
    includeInContributionReport: "Yes"
  },
  {
    order: 1,
    name: "PLEDGE",
    category: "PLEDGE",
    subCategory: "Member Pledge",
    description: "Member Pledge",
    includeInContributionReport: "Yes"
  },
  {
    order: 15,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Recessa",
    description: "Recessa",
    includeInContributionReport: "Yes"
  },
  {
    order: 16,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Self Denial",
    description: "Self Denial",
    includeInContributionReport: "Yes"
  },
  {
    order: 17,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Special Offertory",
    description: "Special Offertory",
    includeInContributionReport: "Yes"
  }
];

// Default Expense Categories for Church
export const defaultExpenseCategories = [
  {
    order: 0,
    name: "BUILDING ACCOUNT",
    category: "BUILDING ACCOUNT",
    subCategory: "BUILDING EXPENSES",
    description: "BUILDING EXPENSES",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Vicar Transfer",
    description: "Vicar Transfer",
    includeInContributionReport: "No"
  },
  {
    order: 1,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Auto Insurance",
    description: "Auto Insurance",
    includeInContributionReport: "No"
  },
  {
    order: 2,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Auto Maint. Fuel",
    description: "Auto Maint. Fuel",
    includeInContributionReport: "No"
  },
  {
    order: 3,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Cleaning/Janitorial",
    description: "Cleaning/Janitorial",
    includeInContributionReport: "No"
  },
  {
    order: 4,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Flower for Altar",
    description: "Flower for Altar",
    includeInContributionReport: "Yes"
  },
  {
    order: 4,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Donations",
    description: "Donations",
    includeInContributionReport: "No"
  },
  {
    order: 5,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Electricity",
    description: "Electricity",
    includeInContributionReport: "No"
  },
  {
    order: 6,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Fire Sprinkler",
    description: "Fire Sprinkler",
    includeInContributionReport: "No"
  },
  {
    order: 7,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Family Conf. Registration",
    description: "Family Conf. Registration",
    includeInContributionReport: "No"
  },
  {
    order: 8,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Altar Flower",
    description: "Altar Flower",
    includeInContributionReport: "No"
  },
  {
    order: 10,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Furniture, Fixture & Other",
    description: "Furniture, Fixture & Other",
    includeInContributionReport: "No"
  },
  {
    order: 11,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Audio, Video, Computer",
    description: "Audio, Video, Computer",
    includeInContributionReport: "No"
  },
  {
    order: 12,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Garbage",
    description: "Garbage",
    includeInContributionReport: "No"
  },
  {
    order: 15,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Coffee & House Keeping Supplies",
    description: "Coffee & House Keeping Supplies",
    includeInContributionReport: "No"
  },
  {
    order: 16,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Lawn Maintenance",
    description: "Maintenance",
    includeInContributionReport: "No"
  },
  {
    order: 17,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Medical Insurance",
    description: "Medical Insurance",
    includeInContributionReport: "No"
  },
  {
    order: 18,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Mortgage Loan",
    description: "Mortgage Loan",
    includeInContributionReport: "No"
  },
  {
    order: 19,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Postage & Stamps",
    description: "Postage & Stamps",
    includeInContributionReport: "No"
  },
  {
    order: 20,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Printing and Stationery",
    description: "Printing and Stationery",
    includeInContributionReport: "No"
  },
  {
    order: 21,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Property Insurance",
    description: "Property Insurance",
    includeInContributionReport: "No"
  },
  {
    order: 22,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Public Relations",
    description: "Public Relations",
    includeInContributionReport: "No"
  },
  {
    order: 23,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Repairs and Maintenance",
    description: "Repairs and Maintenance",
    includeInContributionReport: "No"
  },
  {
    order: 24,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Security Alarm",
    description: "Security Alarm",
    includeInContributionReport: "No"
  },
  {
    order: 25,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Telephone, Internet, Acc Software",
    description: "Telephone, Internet, Acc Software",
    includeInContributionReport: "No"
  },
  {
    order: 26,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Youth Chaplain",
    description: "Youth Chaplain",
    includeInContributionReport: "Yes"
  },
  {
    order: 26,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Vicar Salary",
    description: "Vicar Salary",
    includeInContributionReport: "No"
  },
  {
    order: 27,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Vicar Travel and Clergy Conf.",
    description: "Vicar Travel and Clergy Conf.",
    includeInContributionReport: "No"
  },
  {
    order: 28,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Water",
    description: "Water",
    includeInContributionReport: "No"
  },
  {
    order: 29,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Worship Expenses",
    description: "Worship Expenses",
    includeInContributionReport: "No"
  },
  {
    order: 30,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Farewell (Vicar/Thirumeni)",
    description: "Farewell (Vicar/Thirumeni)",
    includeInContributionReport: "No"
  },
  {
    order: 33,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Security",
    description: "Security",
    includeInContributionReport: "No"
  },
  {
    order: 34,
    name: "CHURCH",
    category: "CHURCH",
    subCategory: "Vicar Medical Expenses",
    description: "Vicar Medical Expenses",
    includeInContributionReport: "No"
  },
  {
    order: 60,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Annual Convention",
    description: "Annual Convention",
    includeInContributionReport: "No"
  },
  {
    order: 61,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Annual Picnic",
    description: "Annual Picnic",
    includeInContributionReport: "No"
  },
  {
    order: 62,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Christmas Breakfast",
    description: "Christmas Breakfast",
    includeInContributionReport: "No"
  },
  {
    order: 63,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Easter Breakfast",
    description: "Easter Breakfast",
    includeInContributionReport: "No"
  },
  {
    order: 64,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Good Friday",
    description: "Good Friday",
    includeInContributionReport: "No"
  },
  {
    order: 65,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Wedding",
    description: "Wedding",
    includeInContributionReport: "No"
  },
  {
    order: 66,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Parish Day",
    description: "Parish Day",
    includeInContributionReport: "No"
  },
  {
    order: 67,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Thanks Giving",
    description: "Thanks Giving",
    includeInContributionReport: "No"
  },
  {
    order: 68,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Jubilee Year Project",
    description: "Jubilee Year Project",
    includeInContributionReport: "No"
  },
  {
    order: 69,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "Family Sunday Lunch",
    description: "Family Sunday Lunch",
    includeInContributionReport: "No"
  },
  {
    order: 70,
    name: "CHURCH PROGRAMS",
    category: "CHURCH PROGRAMS",
    subCategory: "First Communion",
    description: "First Communion",
    includeInContributionReport: "No"
  },
  {
    order: 80,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "Good Samaritan",
    description: "Good Samaritan",
    includeInContributionReport: "No"
  },
  {
    order: 81,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "Light to Life",
    description: "Light to Life",
    includeInContributionReport: "No"
  },
  {
    order: 84,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "Mission Project",
    description: "Mission Project",
    includeInContributionReport: "No"
  },
  {
    order: 97,
    name: "COMMUNITY OUTREACH",
    category: "COMMUNITY OUTREACH",
    subCategory: "Wayanad Relief Fund",
    description: "Wayanad Relief Fund",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "Diocesan Day Collection",
    category: "Diocesan Day Collection",
    subCategory: "Diocesan Day Collection",
    description: "Diocesan Day Collection",
    includeInContributionReport: "No"
  },
  {
    order: 51,
    name: "Diocesan Day Collection",
    category: "Diocesan Day Collection",
    subCategory: "No",
    description: "No",
    includeInContributionReport: "No"
  },
  {
    order: 51,
    name: "Diocesan Day Collection",
    category: "Diocesan Day Collection",
    subCategory: "Diocesan Day Collection",
    description: "Diocesan Day Collection",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Premium Visa Processing Fee",
    description: "Premium Visa Processing Fee",
    includeInContributionReport: "No"
  },
  {
    order: 57,
    name: "DIOCESAN OFFICE",
    category: "DIOCESAN OFFICE",
    subCategory: "Theological Students Prac Training",
    description: "Theological Students Prac Training",
    includeInContributionReport: "No"
  },
  {
    order: 85,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Balawadi",
    description: "Balawadi",
    includeInContributionReport: "No"
  },
  {
    order: 86,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Diocesan Day Collection",
    description: "Diocesan Day Collection",
    includeInContributionReport: "No"
  },
  {
    order: 87,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Diocesan Dev. Fund",
    description: "Diocesan Dev. Fund",
    includeInContributionReport: "No"
  },
  {
    order: 88,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Metropolitan/Episcopal Travel",
    description: "Metropolitan/Episcopal Travel",
    includeInContributionReport: "No"
  },
  {
    order: 89,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Visa processing fee",
    description: "Visa processing fee",
    includeInContributionReport: "No"
  },
  {
    order: 90,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Salary Adjustment Fund",
    description: "Salary Adjustment Fund",
    includeInContributionReport: "No"
  },
  {
    order: 91,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Suvisesha Nidhi",
    description: "Suvisesha Nidhi",
    includeInContributionReport: "No"
  },
  {
    order: 93,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "RAC",
    description: "RAC",
    includeInContributionReport: "No"
  },
  {
    order: 94,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Nitya Chilavu",
    description: "Nitya Chilavu",
    includeInContributionReport: "No"
  },
  {
    order: 95,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Special Offertory",
    description: "Special Offertory",
    includeInContributionReport: "No"
  },
  {
    order: 97,
    name: "DIOCESE OFFICE",
    category: "DIOCESE OFFICE",
    subCategory: "Higher Education Scholarship Fund",
    description: "Higher Education Scholarship Fund",
    includeInContributionReport: "No"
  },
  {
    order: 70,
    name: "FIRST COMMUNION",
    category: "FIRST COMMUNION",
    subCategory: "FIRST COMMUNION EXPENSES",
    description: "FIRST COMMUNION EXPENSES",
    includeInContributionReport: "No"
  },
  {
    order: 71,
    name: "GRANT TO ORGANIZATIONS",
    category: "GRANT TO ORGANIZATIONS",
    subCategory: "Vidhyarambam to Sunday School",
    description: "Vidhyarambam to Sunday School",
    includeInContributionReport: "No"
  },
  {
    order: 73,
    name: "GRANT TO ORGANIZATIONS",
    category: "GRANT TO ORGANIZATIONS",
    subCategory: "Senior Citizen",
    description: "Senior Citizen",
    includeInContributionReport: "No"
  },
  {
    order: 75,
    name: "GRANT TO ORGANIZATIONS",
    category: "GRANT TO ORGANIZATIONS",
    subCategory: "Choir",
    description: "Choir",
    includeInContributionReport: "No"
  },
  {
    order: 76,
    name: "GRANT TO ORGANIZATIONS",
    category: "GRANT TO ORGANIZATIONS",
    subCategory: "Sunday School",
    description: "Sunday School",
    includeInContributionReport: "No"
  },
  {
    order: 77,
    name: "GRANT TO ORGANIZATIONS",
    category: "GRANT TO ORGANIZATIONS",
    subCategory: "Youth Fellowship",
    description: "Youth Fellowship",
    includeInContributionReport: "No"
  },
  {
    order: 90,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Transfer to Building Fund",
    description: "Transfer to Building Fund",
    includeInContributionReport: "No"
  },
  {
    order: 95,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Prior Year Liabilities",
    description: "Prior Year Liabilities",
    includeInContributionReport: "No"
  },
  {
    order: 111,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Bank Charges/Returned Checks",
    description: "Bank Charges/Returned Checks",
    includeInContributionReport: "No"
  },
  {
    order: 112,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Contingency",
    description: "Contingency",
    includeInContributionReport: "No"
  },
  {
    order: 115,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Honorarium for Guests",
    description: "Honorarium for Guests",
    includeInContributionReport: "No"
  },
  {
    order: 117,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Misc. Expenses",
    description: "Misc. Expenses",
    includeInContributionReport: "No"
  },
  {
    order: 118,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Church Facilities",
    description: "Church Facilities",
    includeInContributionReport: "No"
  },
  {
    order: 400,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "KECF",
    description: "KECF",
    includeInContributionReport: "No"
  },
  {
    order: 402,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Trophies & Awards",
    description: "Trophies & Awards",
    includeInContributionReport: "No"
  },
  {
    order: 410,
    name: "OTHER ITEMS",
    category: "OTHER ITEMS",
    subCategory: "Bank Credit Card Fees",
    description: "Bank Credit Card Fees",
    includeInContributionReport: "No"
  },
  {
    order: 40,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Cleaning/Janitorial",
    description: "Cleaning/Janitorial",
    includeInContributionReport: "No"
  },
  {
    order: 41,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Furniture Fixtures and Other",
    description: "Furniture Fixtures and Other",
    includeInContributionReport: "No"
  },
  {
    order: 42,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Gas Utility",
    description: "Gas Utility",
    includeInContributionReport: "No"
  },
  {
    order: 43,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "HOA Fees",
    description: "HOA Fees",
    includeInContributionReport: "No"
  },
  {
    order: 44,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Internet, Cable, TV",
    description: "Internet, Cable, TV",
    includeInContributionReport: "No"
  },
  {
    order: 45,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Lawn Maintenance",
    description: "Lawn Maintenance",
    includeInContributionReport: "No"
  },
  {
    order: 46,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Mortgage Loan",
    description: "Mortgage Loan",
    includeInContributionReport: "No"
  },
  {
    order: 47,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Repairs and Maintenance",
    description: "Repairs and Maintenance",
    includeInContributionReport: "No"
  },
  {
    order: 48,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Security Alarm",
    description: "Security Alarm",
    includeInContributionReport: "No"
  },
  {
    order: 49,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Telephone and Cell Phone",
    description: "Telephone and Cell Phone",
    includeInContributionReport: "No"
  },
  {
    order: 50,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Utility/Elec, Water, Garbage",
    description: "Utility/Elec, Water, Garbage",
    includeInContributionReport: "No"
  },
  {
    order: 51,
    name: "PARSONAGE",
    category: "PARSONAGE",
    subCategory: "Miscellaneous",
    description: "Miscellaneous",
    includeInContributionReport: "No"
  },
  {
    order: 82,
    name: "PASS THROUGH PAYMENTS",
    category: "PASS THROUGH PAYMENTS",
    subCategory: "Other",
    description: "Other",
    includeInContributionReport: "No"
  },
  {
    order: 125,
    name: "PASS THROUGH PAYMENTS",
    category: "PASS THROUGH PAYMENTS",
    subCategory: "House Keeping",
    description: "House Keeping",
    includeInContributionReport: "No"
  },
  {
    order: 126,
    name: "PASS THROUGH PAYMENTS",
    category: "PASS THROUGH PAYMENTS",
    subCategory: "Donations",
    description: "Donations",
    includeInContributionReport: "No"
  },
  {
    order: 127,
    name: "PASS THROUGH PAYMENTS",
    category: "PASS THROUGH PAYMENTS",
    subCategory: "PASS THROUGH PAYMENTS",
    description: "PASS THROUGH PAYMENTS",
    includeInContributionReport: "No"
  },
  {
    order: 67,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "World Sunday School",
    description: "World Sunday School",
    includeInContributionReport: "No"
  },
  {
    order: 100,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Pension Fund",
    description: "Pension Fund",
    includeInContributionReport: "No"
  },
  {
    order: 101,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Provident Fund",
    description: "Provident Fund",
    includeInContributionReport: "No"
  },
  {
    order: 102,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Recessa",
    description: "Recessa",
    includeInContributionReport: "No"
  },
  {
    order: 103,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Self Denial",
    description: "Self Denial",
    includeInContributionReport: "No"
  },
  {
    order: 104,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Seminary Activities",
    description: "Seminary Activities",
    includeInContributionReport: "No"
  },
  {
    order: 105,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "Kumbandu Mandiram",
    description: "Kumbandu Mandiram",
    includeInContributionReport: "No"
  },
  {
    order: 108,
    name: "SABHA OFFICE",
    category: "SABHA OFFICE",
    subCategory: "SPECIAL OFFERTORY (13 OFFERTORIES)",
    description: "SPECIAL OFFERTORY (13 OFFERTORIES)",
    includeInContributionReport: "No"
  },
  {
    order: 0,
    name: "Vicar Medical Expenses",
    category: "Vicar Medical Expenses",
    subCategory: "Vicar Medical Expenses",
    description: "Vicar Medical Expenses",
    includeInContributionReport: "No"
  }
];

// Function to check if a category already exists
const categoryExists = async (collectionName, categoryName,catsubCategory) => {
  const q = query(
    collection(db, collectionName),
    where('name', '==', categoryName),
    where('subCategory', '==', catsubCategory)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Function to seed income categories
export const seedIncomeCategories = async () => {
  const results = {
    added: 0,
    skipped: 0,
    errors: []
  };

  for (const category of defaultIncomeCategories) {
    try {
      const exists = await categoryExists('incomeCategories', category.name,category.subCategory);
      if (!exists) {
        await addDoc(collection(db, 'incomeCategories'), {
          ...category,
          createdAt: new Date()
        });
        results.added++;
        console.log(`Added income category: ${category.name}`);
      } else {
        results.skipped++;
        console.log(`Skipped existing income category: ${category.name}`);
      }
    } catch (error) {
      results.errors.push({ category: category.name, error: error.message });
      console.error(`Error adding income category ${category.name}:`, error);
    }
  }

  return results;
};

// Function to seed expense categories
export const seedExpenseCategories = async () => {
  const results = {
    added: 0,
    skipped: 0,
    errors: []
  };

  for (const category of defaultExpenseCategories) {
    try {
      const exists = await categoryExists('expenseCategories', category.name,category.subCategory);
      if (!exists) {
        await addDoc(collection(db, 'expenseCategories'), {
          ...category,
          createdAt: new Date()
        });
        results.added++;
        console.log(`Added expense category: ${category.name}`);
      } else {
        results.skipped++;
        console.log(`Skipped existing expense category: ${category.name}`);
      }
    } catch (error) {
      results.errors.push({ category: category.name, error: error.message });
      console.error(`Error adding expense category ${category.name}:`, error);
    }
  }

  return results;
};

// Function to seed all categories
export const seedAllCategories = async () => {
  console.log('Starting to seed categories...');

  const incomeResults = await seedIncomeCategories();
  const expenseResults = await seedExpenseCategories();

  const totalResults = {
    income: incomeResults,
    expense: expenseResults,
    summary: {
      totalAdded: incomeResults.added + expenseResults.added,
      totalSkipped: incomeResults.skipped + expenseResults.skipped,
      totalErrors: incomeResults.errors.length + expenseResults.errors.length
    }
  };

  console.log('Seeding complete:', totalResults.summary);
  return totalResults;
};
