-- Full-text search index so AI pricing can narrow a large price list catalog
-- (e.g. an imported cost database) down to a handful of relevant candidates
-- per scope item instead of sending the entire catalog to the model.
CREATE INDEX "PriceListItem_search_idx" ON "PriceListItem"
USING GIN (to_tsvector('english', "name" || ' ' || coalesce("category", '')));
