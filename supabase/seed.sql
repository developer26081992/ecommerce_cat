-- Sample catalogue with local illustrative image paths. Safe to re-run.
insert into public.categories (id,name,slug) values
('10000000-0000-4000-8000-000000000001','Ceramics','ceramics'),
('10000000-0000-4000-8000-000000000002','Textiles','textiles'),
('10000000-0000-4000-8000-000000000003','Living','living')
on conflict (id) do nothing;

insert into public.products (id,slug,name,description,price,stock,"imageUrl","categoryId",featured) values
('20000000-0000-4000-8000-000000000001','terra-vase','Terra vase','An earthy silhouette for a single stem or a quiet corner. This sculptural stoneware vase has a softly textured, unglazed finish. Each piece brings a little warmth to the everyday.',420,8,'/products/vase.svg','10000000-0000-4000-8000-000000000001',true),
('20000000-0000-4000-8000-000000000002','everyday-mug','Everyday mug','A generous, rounded mug for slow mornings. Glazed stoneware with a comfortable handle and a natural clay foot. Holds 350 ml. Dishwasher safe.',185,16,'/products/mug.svg','10000000-0000-4000-8000-000000000001',true),
('20000000-0000-4000-8000-000000000003','linen-throw','Linen throw','A soft, breathable layer in a gentle olive tone. Drape it over your favourite chair or keep it close on cooler evenings. 130 × 180 cm. Gentle cold wash.',890,5,'/products/throw.svg','10000000-0000-4000-8000-000000000002',true),
('20000000-0000-4000-8000-000000000004','oak-serving-board','Oak serving board','Simple lines, a generous surface, and the warmth of natural oak. Made for bread, shared snacks, and easy gatherings. 38 × 20 cm. Hand wash and oil occasionally.',365,10,'/products/board.svg','10000000-0000-4000-8000-000000000003',true),
('20000000-0000-4000-8000-000000000005','gather-bowl','Gather bowl','A low, wide bowl in a soft chalk glaze. A lovely home for seasonal fruit or a shared salad. Stoneware, 26 cm diameter. Dishwasher safe.',340,7,'/products/bowl.svg','10000000-0000-4000-8000-000000000001',false),
('20000000-0000-4000-8000-000000000006','woven-cushion','Woven cushion','Rich texture, a quiet terracotta tone, and a soft cotton weave. An effortless finishing touch for your sofa. 45 × 45 cm, with removable cover.',450,0,'/products/cushion.svg','10000000-0000-4000-8000-000000000002',false)
on conflict (id) do nothing;
