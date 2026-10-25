-- Data migration (runs once): create The Bhadohi Collection and make it the home of the
-- Agni and Alankar carpets, replacing their earlier Form / Heritage placement.
INSERT INTO "Collection" ("id", "slug", "name", "tagline", "description", "image", "seoTitle", "seoDescription", "sortOrder", "isPublished", "createdAt", "updatedAt")
VALUES (
  'col_bhadohi_collection',
  'the-bhadohi-collection',
  'The Bhadohi Collection',
  'Our first carpets, hand-tufted in the carpet capital of India.',
  'Bhadohi, on the banks of the Ganga, has made carpets for centuries. This collection gathers our first pieces from its workshops, from a sculptural free-form statement to a quiet heritage medallion. Each is hand-tufted in New Zealand wool and made to order.',
  '/catalogue/agni-top-down.webp',
  'The Bhadohi Collection | Hand-Tufted Wool Carpets Made in India',
  'Hand-tufted New Zealand wool carpets, made to order in Bhadohi, India. Shipped to the US, UK and Europe.',
  0, true, NOW(), NOW()
)
ON CONFLICT ("slug") DO NOTHING;

DELETE FROM "ProductCollection"
WHERE "productId" IN (SELECT "id" FROM "Product" WHERE "slug" IN ('agni-hand-tufted-wool-carpet', 'alankar-hand-tufted-wool-carpet'));

INSERT INTO "ProductCollection" ("productId", "collectionId")
SELECT p."id", c."id"
FROM "Product" p, "Collection" c
WHERE p."slug" IN ('agni-hand-tufted-wool-carpet', 'alankar-hand-tufted-wool-carpet')
  AND c."slug" = 'the-bhadohi-collection'
ON CONFLICT DO NOTHING;
