-- English is the canonical database language. Frontend localization uses stable slug/code keys.
UPDATE "public"."categories"
SET "name" = CASE "slug"
  WHEN 'mathematics' THEN 'Mathematics'
  WHEN 'japanese' THEN 'Japanese'
  WHEN 'technology' THEN 'Technology'
  WHEN 'science' THEN 'Science'
  WHEN 'english' THEN 'English'
  WHEN 'chinese' THEN 'Chinese'
  WHEN 'korean' THEN 'Korean'
  WHEN 'thai-language' THEN 'Thai Language'
  WHEN 'business-accounting' THEN 'Business & Accounting'
  WHEN 'design-arts' THEN 'Design & Arts'
  WHEN 'industry-engineering' THEN 'Industry & Engineering'
  WHEN 'agriculture' THEN 'Agriculture'
  WHEN 'tourism-hospitality' THEN 'Tourism & Hospitality'
  WHEN 'health-physical-education' THEN 'Health & Physical Education'
  WHEN 'personal-development' THEN 'Personal Development'
  ELSE "name"
END,
"updated_at" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'mathematics', 'japanese', 'technology', 'science', 'english', 'chinese', 'korean',
  'thai-language', 'business-accounting', 'design-arts', 'industry-engineering',
  'agriculture', 'tourism-hospitality', 'health-physical-education', 'personal-development'
);

UPDATE "public"."majors"
SET "major_name" = CASE "major_code"
  WHEN 'VOC-IND' THEN 'Vocational Certificate (Voc. Cert.) — Industry'
  WHEN 'VOC-COM' THEN 'Vocational Certificate (Voc. Cert.) — Commerce'
  WHEN 'VOC-ART' THEN 'Vocational Certificate (Voc. Cert.) — Fine Arts'
  WHEN 'VOC-HOME' THEN 'Vocational Certificate (Voc. Cert.) — Home Economics'
  WHEN 'VOC-AGR' THEN 'Vocational Certificate (Voc. Cert.) — Agriculture'
  WHEN 'VOC-FISH' THEN 'Vocational Certificate (Voc. Cert.) — Fisheries'
  WHEN 'VOC-TOUR' THEN 'Vocational Certificate (Voc. Cert.) — Tourism Industry'
  WHEN 'VOC-TEXT' THEN 'Vocational Certificate (Voc. Cert.) — Textile Industry'
  WHEN 'VOC-ICT' THEN 'Vocational Certificate (Voc. Cert.) — Information and Communication Technology'
  WHEN 'HVC-IND' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Industry'
  WHEN 'HVC-COM' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Commerce'
  WHEN 'HVC-ART' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Fine Arts'
  WHEN 'HVC-HOME' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Home Economics'
  WHEN 'HVC-AGR' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Agriculture'
  WHEN 'HVC-FISH' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Fisheries'
  WHEN 'HVC-TOUR' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Tourism Industry'
  WHEN 'HVC-TEXT' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Textile Industry'
  WHEN 'HVC-ICT' THEN 'Higher Vocational Certificate (High Voc. Cert.) — Information and Communication Technology'
  WHEN 'BTECH-IND' THEN 'Bachelor of Technology (B.Tech.) — Industry'
  WHEN 'BTECH-COM' THEN 'Bachelor of Technology (B.Tech.) — Commerce'
  WHEN 'BTECH-ART' THEN 'Bachelor of Technology (B.Tech.) — Fine Arts'
  WHEN 'BTECH-HOME' THEN 'Bachelor of Technology (B.Tech.) — Home Economics'
  WHEN 'BTECH-AGR' THEN 'Bachelor of Technology (B.Tech.) — Agriculture'
  WHEN 'BTECH-FISH' THEN 'Bachelor of Technology (B.Tech.) — Fisheries'
  WHEN 'BTECH-TOUR' THEN 'Bachelor of Technology (B.Tech.) — Tourism Industry'
  WHEN 'BTECH-TEXT' THEN 'Bachelor of Technology (B.Tech.) — Textile Industry'
  WHEN 'BTECH-ICT' THEN 'Bachelor of Technology (B.Tech.) — Information and Communication Technology'
  ELSE "major_name"
END
WHERE "major_code" LIKE 'VOC-%'
   OR "major_code" LIKE 'HVC-%'
   OR "major_code" LIKE 'BTECH-%';
