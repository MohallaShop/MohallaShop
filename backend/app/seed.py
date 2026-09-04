"""Development seed data for MohallaShop.

Run against your development database:

    uv run --directory backend python -m app.seed

The seed is idempotent. It creates or updates stable demo users, shops,
categories, product details, product images, and inventory counts without
duplicating records on repeated runs.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session_maker
from app.shops.models import Category, Inventory, Product, Shop, ShopStatus
from app.users.models import Address, User, UserProfile

CUSTOMER_ID_DEV = '00000000-0000-0000-0000-0000000000a1'
CUSTOMER_ADDRESS_ID_DEV = '00000000-0000-0000-0000-0000000000d1'

IMAGE_BASE = 'https://images.unsplash.com/'


@dataclass(frozen=True)
class CategorySeed:
    name: str
    slug: str
    sort_order: int


@dataclass(frozen=True)
class ProductSeed:
    name: str
    category_slug: str
    price: Decimal
    unit: str
    stock: int
    description: str
    image_url: str
    low_stock_threshold: int = 5
    is_active: bool = True


@dataclass(frozen=True)
class ShopSeed:
    owner_user_id: str
    phone: str
    profile_name: str
    name: str
    description: str
    address_line1: str
    address_line2: str | None
    address_city: str
    address_state: str
    address_pincode: str
    latitude: Decimal
    longitude: Decimal
    delivery_fee: Decimal
    products: tuple[ProductSeed, ...]


def img(photo_id: str) -> str:
    return f'{IMAGE_BASE}{photo_id}?auto=format&fit=crop&w=640&q=80'


def product(
    name: str,
    category_slug: str,
    price: str,
    unit: str,
    stock: int,
    description: str,
    photo_id: str,
    low_stock_threshold: int = 5,
) -> ProductSeed:
    return ProductSeed(
        name=name,
        category_slug=category_slug,
        price=Decimal(price),
        unit=unit,
        stock=stock,
        description=description,
        image_url=img(photo_id),
        low_stock_threshold=low_stock_threshold,
    )


CATEGORIES = (
    CategorySeed('Groceries', 'groceries', 10),
    CategorySeed('Fruits & Vegetables', 'fruits-vegetables', 20),
    CategorySeed('Dairy & Eggs', 'dairy-eggs', 30),
    CategorySeed('Bakery', 'bakery', 40),
    CategorySeed('Snacks & Drinks', 'snacks-drinks', 50),
    CategorySeed('Household', 'household', 60),
    CategorySeed('Personal Care', 'personal-care', 70),
    CategorySeed('Pharmacy', 'pharmacy', 80),
)


SHOPS = (
    ShopSeed(
        owner_user_id='00000000-0000-0000-0000-0000000000b2',
        phone='+919000000002',
        profile_name='Sharma Kirana',
        name='Sharma Kirana Store',
        description='Trusted neighbourhood store for daily staples, fresh basics, and home needs.',
        address_line1='12, Gandhi Chowk',
        address_line2='Near City Bakery',
        address_city='Pune',
        address_state='Maharashtra',
        address_pincode='411001',
        latitude=Decimal('18.520430'),
        longitude=Decimal('73.856743'),
        delivery_fee=Decimal('20.00'),
        products=(
            product(
                'Wheat Atta (Fortified)',
                'groceries',
                '52.00',
                '1 kg',
                48,
                'Stone-ground daily wheat flour for soft rotis.',
                'photo-1574323347407-f5e1ad6d020b',
                8,
            ),
            product(
                'Basmati Rice Premium',
                'groceries',
                '128.00',
                '5 kg',
                22,
                'Long-grain basmati rice for biryani, pulao, and daily meals.',
                'photo-1586201375761-83865001e31c',
                5,
            ),
            product(
                'Fresh Tomatoes',
                'fruits-vegetables',
                '30.00',
                '500 g',
                60,
                'Firm, ripe tomatoes for curries, chutneys, and salads.',
                'photo-1546094096-0df4bcaaa337',
            ),
            product(
                'Potatoes',
                'fruits-vegetables',
                '28.00',
                '1 kg',
                54,
                'Everyday potatoes for sabzi, fries, and snacks.',
                'photo-1518977676601-b53f82aba655',
            ),
            product(
                'Onions',
                'fruits-vegetables',
                '36.00',
                '1 kg',
                44,
                'Fresh red onions for daily cooking.',
                'photo-1508747703725-719777637510',
            ),
            product(
                'Bananas',
                'fruits-vegetables',
                '62.00',
                '1 dozen',
                30,
                'Sweet yellow bananas for breakfast and snacks.',
                'photo-1571771894821-ce9b6c11b08e',
            ),
            product(
                'Amul Milk',
                'dairy-eggs',
                '28.00',
                '500 ml',
                42,
                'Fresh toned milk pouch for tea, coffee, and cereal.',
                'photo-1563636619-e9143da7973b',
                10,
            ),
            product(
                'Cottage Cheese (Paneer)',
                'dairy-eggs',
                '90.00',
                '200 g',
                16,
                'Fresh paneer for curries, rolls, and grilled snacks.',
                'photo-1486297678162-eb2a19b0a32d',
            ),
            product(
                'Farm Eggs',
                'dairy-eggs',
                '72.00',
                '6 pcs',
                34,
                'Clean packed eggs for breakfast and baking.',
                'photo-1518569656558-1f25e69d93d7',
            ),
            product(
                'Brown Bread',
                'bakery',
                '45.00',
                '400 g',
                18,
                'Soft brown bread loaf baked fresh.',
                'photo-1509440159596-0249088772ff',
            ),
            product(
                'Masala Tea',
                'snacks-drinks',
                '145.00',
                '250 g',
                24,
                'Strong tea blend with warm spices.',
                'photo-1564890369478-c89ca6d9cde9',
            ),
            product(
                'Cooking Oil',
                'groceries',
                '165.00',
                '1 L',
                18,
                'Refined cooking oil for everyday meals.',
                'photo-1474979266404-7eaacbcd87c5',
            ),
        ),
    ),
    ShopSeed(
        owner_user_id='00000000-0000-0000-0000-0000000000b3',
        phone='+919000000003',
        profile_name='FreshMart Produce',
        name='FreshMart Produce',
        description='Morning-sourced fruits and vegetables with clean packs and quick delivery.',
        address_line1='48, Model Colony Road',
        address_line2='Opposite Green Park',
        address_city='Pune',
        address_state='Maharashtra',
        address_pincode='411016',
        latitude=Decimal('18.532210'),
        longitude=Decimal('73.838080'),
        delivery_fee=Decimal('18.00'),
        products=(
            product(
                'Royal Gala Apples',
                'fruits-vegetables',
                '185.00',
                '1 kg',
                26,
                'Crisp imported apples with balanced sweetness.',
                'photo-1579613832125-5d34a13ffe2a',
            ),
            product(
                'Nagpur Oranges',
                'fruits-vegetables',
                '95.00',
                '1 kg',
                38,
                'Juicy seasonal oranges for fresh juice and snacking.',
                'photo-1611080626919-7cf5a9dbab5b',
            ),
            product(
                'Carrots',
                'fruits-vegetables',
                '42.00',
                '500 g',
                46,
                'Crunchy orange carrots for salads, sabzi, and soups.',
                'photo-1598170845058-32b9d6a5da37',
            ),
            product(
                'Cucumbers',
                'fruits-vegetables',
                '35.00',
                '500 g',
                34,
                'Hydrating cucumbers for salads and raita.',
                'photo-1449300079323-02e209d9d3a6',
            ),
            product(
                'Baby Spinach',
                'fruits-vegetables',
                '55.00',
                '250 g',
                20,
                'Tender spinach leaves washed and packed.',
                'photo-1576045057995-568f588f82fb',
            ),
            product(
                'Coriander Bunch',
                'fruits-vegetables',
                '18.00',
                '1 bunch',
                45,
                'Fresh coriander for chutneys and garnishing.',
                'photo-1515543237350-b3eea1ec8082',
            ),
            product(
                'Lemons',
                'fruits-vegetables',
                '38.00',
                '6 pcs',
                32,
                'Zesty lemons for drinks, salads, and marinades.',
                'photo-1590502593747-42a996133562',
            ),
            product(
                'Green Grapes',
                'fruits-vegetables',
                '110.00',
                '500 g',
                28,
                'Sweet seedless grapes packed fresh.',
                'photo-1537640538966-79f369143f8f',
            ),
            product(
                'Cauliflower',
                'fruits-vegetables',
                '48.00',
                '1 pc',
                18,
                'Compact cauliflower for curries and parathas.',
                'photo-1540420773420-3366772f4999',
            ),
            product(
                'Ginger',
                'fruits-vegetables',
                '32.00',
                '200 g',
                24,
                'Aromatic ginger for tea and cooking.',
                'photo-1615485290382-441e4d049cb5',
            ),
            product(
                'Green Chillies',
                'fruits-vegetables',
                '24.00',
                '100 g',
                30,
                'Spicy green chillies for daily tadka.',
                'photo-1583119022894-919a68a3d0e3',
            ),
            product(
                'Button Mushrooms',
                'fruits-vegetables',
                '85.00',
                '200 g',
                15,
                'Fresh button mushrooms for stir-fries and pasta.',
                'photo-1504545102780-26774c1bb073',
            ),
        ),
    ),
    ShopSeed(
        owner_user_id='00000000-0000-0000-0000-0000000000b4',
        phone='+919000000004',
        profile_name='Daily Dairy & Bakery',
        name='Daily Dairy & Bakery',
        description='Fresh dairy, breads, eggs, and breakfast essentials from nearby suppliers.',
        address_line1='7, FC Road',
        address_line2='Lane 3',
        address_city='Pune',
        address_state='Maharashtra',
        address_pincode='411004',
        latitude=Decimal('18.520030'),
        longitude=Decimal('73.841920'),
        delivery_fee=Decimal('22.00'),
        products=(
            product(
                'Full Cream Milk',
                'dairy-eggs',
                '34.00',
                '500 ml',
                38,
                'Rich full cream milk for tea, sweets, and desserts.',
                'photo-1563636619-e9143da7973b',
                8,
            ),
            product(
                'Fresh Curd',
                'dairy-eggs',
                '48.00',
                '400 g',
                26,
                'Thick set curd for meals and lassi.',
                'photo-1488477181946-6428a0291777',
            ),
            product(
                'Salted Butter',
                'dairy-eggs',
                '58.00',
                '100 g',
                24,
                'Creamy salted butter for toast and cooking.',
                'photo-1589985270826-4b7bb135bc9d',
            ),
            product(
                'Cheese Slices',
                'dairy-eggs',
                '125.00',
                '200 g',
                18,
                'Soft processed cheese slices for sandwiches.',
                'photo-1552767059-ce182ead6c1b',
            ),
            product(
                'Classic Paneer',
                'dairy-eggs',
                '92.00',
                '200 g',
                22,
                'Soft paneer cubes made from fresh milk.',
                'photo-1486297678162-eb2a19b0a32d',
            ),
            product(
                'Brown Eggs',
                'dairy-eggs',
                '96.00',
                '6 pcs',
                20,
                'Protein-rich brown eggs in a secure carton.',
                'photo-1518569656558-1f25e69d93d7',
            ),
            product(
                'White Sandwich Bread',
                'bakery',
                '42.00',
                '400 g',
                28,
                'Soft sliced bread for sandwiches and toast.',
                'photo-1509440159596-0249088772ff',
            ),
            product(
                'Whole Wheat Pav',
                'bakery',
                '36.00',
                '6 pcs',
                22,
                'Soft pav rolls for bhaji and breakfast.',
                'photo-1586444248902-2f64eddc13df',
            ),
            product(
                'Burger Buns',
                'bakery',
                '55.00',
                '4 pcs',
                14,
                'Fresh sesame buns for homemade burgers.',
                'photo-1551183053-bf91a1d81141',
            ),
            product(
                'Fruit Yogurt',
                'dairy-eggs',
                '40.00',
                '100 g',
                30,
                'Creamy fruit yogurt cup for quick snacking.',
                'photo-1571212515416-fef01fc43637',
            ),
            product(
                'Sweet Lassi',
                'snacks-drinks',
                '35.00',
                '200 ml',
                24,
                'Chilled sweet lassi bottle.',
                'photo-1544145945-f90425340c7e',
            ),
            product(
                'Chocolate Muffins',
                'bakery',
                '90.00',
                '2 pcs',
                16,
                'Moist chocolate muffins baked in small batches.',
                'photo-1607958996333-41aef7caefaa',
            ),
        ),
    ),
    ShopSeed(
        owner_user_id='00000000-0000-0000-0000-0000000000b5',
        phone='+919000000005',
        profile_name='QuickSnacks Corner',
        name='QuickSnacks Corner',
        description='Snacks, drinks, tea-time packs, and quick bites for work and home.',
        address_line1='21, JM Road',
        address_line2='Next to Metro Plaza',
        address_city='Pune',
        address_state='Maharashtra',
        address_pincode='411005',
        latitude=Decimal('18.529120'),
        longitude=Decimal('73.847320'),
        delivery_fee=Decimal('16.00'),
        products=(
            product(
                'Salted Potato Chips',
                'snacks-drinks',
                '20.00',
                '52 g',
                60,
                'Crispy salted potato chips for quick snacking.',
                'photo-1566478989037-eec170784d0b',
            ),
            product(
                'Masala Namkeen',
                'snacks-drinks',
                '65.00',
                '200 g',
                42,
                'Crunchy spiced namkeen mix for tea time.',
                'photo-1599490659213-e2b9527bd087',
            ),
            product(
                'Butter Cookies',
                'snacks-drinks',
                '75.00',
                '250 g',
                30,
                'Classic butter cookies in a family pack.',
                'photo-1558961363-fa8fdf82db35',
            ),
            product(
                'Dark Chocolate Bar',
                'snacks-drinks',
                '110.00',
                '100 g',
                20,
                'Smooth dark chocolate with rich cocoa notes.',
                'photo-1606312619070-d48b4c652a52',
            ),
            product(
                'Instant Noodles',
                'snacks-drinks',
                '56.00',
                '280 g',
                36,
                'Two-minute masala noodles for fast meals.',
                'photo-1612929633738-8fe44f7ec841',
            ),
            product(
                'Cola Bottle',
                'snacks-drinks',
                '42.00',
                '750 ml',
                24,
                'Chilled cola bottle for parties and meals.',
                'photo-1622483767028-3f66f32aef97',
            ),
            product(
                'Mixed Fruit Juice',
                'snacks-drinks',
                '110.00',
                '1 L',
                18,
                'Ready-to-serve mixed fruit juice carton.',
                'photo-1613478223719-2ab802602423',
            ),
            product(
                'Instant Coffee',
                'snacks-drinks',
                '190.00',
                '100 g',
                14,
                'Aromatic instant coffee granules.',
                'photo-1495474472287-4d71bcdd2085',
            ),
            product(
                'Green Tea Bags',
                'snacks-drinks',
                '135.00',
                '25 bags',
                20,
                'Light green tea bags for daily wellness routines.',
                'photo-1564890369478-c89ca6d9cde9',
            ),
            product(
                'Mineral Water',
                'snacks-drinks',
                '20.00',
                '1 L',
                80,
                'Sealed mineral water bottle.',
                'photo-1523362628745-0c100150b504',
                15,
            ),
            product(
                'Energy Bars',
                'snacks-drinks',
                '120.00',
                '6 pcs',
                16,
                'Nut and cereal energy bars for travel and workouts.',
                'photo-1511690656952-34342bb7c2f2',
            ),
            product(
                'Microwave Popcorn',
                'snacks-drinks',
                '85.00',
                '3 packs',
                18,
                'Butter-flavoured microwave popcorn packs.',
                'photo-1578849278619-e73505e9610f',
            ),
        ),
    ),
    ShopSeed(
        owner_user_id='00000000-0000-0000-0000-0000000000b6',
        phone='+919000000006',
        profile_name='HomeCare Essentials',
        name='HomeCare Essentials',
        description='Household cleaning, personal-care basics, and monthly home supplies.',
        address_line1='5, Koregaon Park Road',
        address_line2='Shop 4',
        address_city='Pune',
        address_state='Maharashtra',
        address_pincode='411001',
        latitude=Decimal('18.536210'),
        longitude=Decimal('73.893930'),
        delivery_fee=Decimal('24.00'),
        products=(
            product(
                'Laundry Detergent',
                'household',
                '110.00',
                '1 kg',
                28,
                'Daily detergent powder for machine and bucket wash.',
                'photo-1626806787461-102c1bfaaea1',
                6,
            ),
            product(
                'Dishwash Liquid',
                'household',
                '99.00',
                '500 ml',
                24,
                'Grease-cutting dishwash liquid with fresh fragrance.',
                'photo-1622480916113-9000ac49b79d',
            ),
            product(
                'Floor Cleaner',
                'household',
                '125.00',
                '1 L',
                20,
                'Disinfecting floor cleaner for daily mopping.',
                'photo-1585421514284-efb74c2b69ba',
            ),
            product(
                'Toilet Cleaner',
                'household',
                '98.00',
                '500 ml',
                22,
                'Thick toilet cleaner for tough stains.',
                'photo-1584305574647-0cc949a2bb9f',
            ),
            product(
                'Handwash Refill',
                'personal-care',
                '89.00',
                '750 ml',
                26,
                'Gentle handwash refill pack for family use.',
                'photo-1584308666744-24d5c474f2ae',
            ),
            product(
                'Herbal Shampoo',
                'personal-care',
                '175.00',
                '340 ml',
                16,
                'Mild herbal shampoo for regular hair care.',
                'photo-1522338242992-e1a54906a8da',
            ),
            product(
                'Toothpaste',
                'personal-care',
                '68.00',
                '150 g',
                36,
                'Fresh-mint toothpaste for daily dental care.',
                'photo-1556228578-8c89e6adf883',
            ),
            product(
                'Bath Soap Pack',
                'personal-care',
                '92.00',
                '4 pcs',
                34,
                'Family bath soap value pack.',
                'photo-1556228720-195a672e8a03',
            ),
            product(
                'Tissue Rolls',
                'household',
                '130.00',
                '6 rolls',
                18,
                'Soft tissue rolls for kitchen and bathroom use.',
                'photo-1584556812952-905ffd0c611a',
            ),
            product(
                'Garbage Bags',
                'household',
                '120.00',
                '30 bags',
                22,
                'Medium-size drawstring garbage bags.',
                'photo-1604187351574-c75ca79f5807',
            ),
            product(
                'Mosquito Repellent',
                'household',
                '76.00',
                '45 ml',
                20,
                'Plug-in mosquito repellent liquid refill.',
                'photo-1583947581924-860bda6a26df',
            ),
            product(
                'First Aid Bandages',
                'pharmacy',
                '55.00',
                '20 pcs',
                18,
                'Sterile adhesive bandages for minor cuts.',
                'photo-1603398938378-e54eab446dde',
            ),
        ),
    ),
)


async def upsert_user(session: AsyncSession, user_id: str, phone: str | None) -> None:
    await session.execute(
        insert(User)
        .values(id=user_id, phone=phone)
        .on_conflict_do_update(index_elements=['id'], set_={'phone': phone})
    )


async def upsert_profile(
    session: AsyncSession,
    user_id: str,
    display_name: str,
    avatar_url: str | None = None,
) -> None:
    await session.execute(
        insert(UserProfile)
        .values(user_id=user_id, display_name=display_name, avatar_url=avatar_url)
        .on_conflict_do_update(
            index_elements=['user_id'],
            set_={'display_name': display_name, 'avatar_url': avatar_url},
        )
    )


async def upsert_categories(session: AsyncSession) -> dict[str, UUID]:
    slug_to_id: dict[str, UUID] = {}
    for category in CATEGORIES:
        await session.execute(
            insert(Category)
            .values(
                name=category.name,
                slug=category.slug,
                sort_order=category.sort_order,
                parent_id=None,
            )
            .on_conflict_do_update(
                index_elements=['slug'],
                set_={
                    'name': category.name,
                    'sort_order': category.sort_order,
                    'parent_id': None,
                },
            )
        )
        category_id = (
            await session.execute(select(Category.id).where(Category.slug == category.slug))
        ).scalar_one()
        slug_to_id[category.slug] = category_id
    return slug_to_id


async def upsert_customer(session: AsyncSession) -> None:
    await upsert_user(session, CUSTOMER_ID_DEV, '+919000000001')
    await upsert_profile(session, CUSTOMER_ID_DEV, 'Arjun Sharma')
    await session.execute(
        insert(Address)
        .values(
            id=CUSTOMER_ADDRESS_ID_DEV,
            user_id=CUSTOMER_ID_DEV,
            label='Home',
            line1='Flat 204, Maple Residency',
            line2='Baner Road',
            landmark='Near Orchid School',
            city='Pune',
            state='Maharashtra',
            pincode='411045',
            contact_name='Arjun Sharma',
            contact_phone='+919000000001',
            is_default=True,
        )
        .on_conflict_do_update(
            index_elements=['id'],
            set_={
                'user_id': CUSTOMER_ID_DEV,
                'label': 'Home',
                'line1': 'Flat 204, Maple Residency',
                'line2': 'Baner Road',
                'landmark': 'Near Orchid School',
                'city': 'Pune',
                'state': 'Maharashtra',
                'pincode': '411045',
                'contact_name': 'Arjun Sharma',
                'contact_phone': '+919000000001',
                'is_default': True,
            },
        )
    )


async def upsert_shop(session: AsyncSession, shop_seed: ShopSeed) -> UUID:
    await upsert_user(session, shop_seed.owner_user_id, shop_seed.phone)
    await upsert_profile(session, shop_seed.owner_user_id, shop_seed.profile_name)

    shop = (
        await session.execute(
            select(Shop).where(Shop.owner_user_id == shop_seed.owner_user_id)
        )
    ).scalar_one_or_none()
    if shop is None:
        shop = Shop(
            owner_user_id=shop_seed.owner_user_id,
            name=shop_seed.name,
            description=shop_seed.description,
            phone=shop_seed.phone,
            status=ShopStatus.ACTIVE,
            address_line1=shop_seed.address_line1,
            address_line2=shop_seed.address_line2,
            address_city=shop_seed.address_city,
            address_state=shop_seed.address_state,
            address_pincode=shop_seed.address_pincode,
            latitude=shop_seed.latitude,
            longitude=shop_seed.longitude,
            delivery_fee=shop_seed.delivery_fee,
        )
        session.add(shop)
    else:
        shop.name = shop_seed.name
        shop.description = shop_seed.description
        shop.phone = shop_seed.phone
        shop.status = ShopStatus.ACTIVE
        shop.address_line1 = shop_seed.address_line1
        shop.address_line2 = shop_seed.address_line2
        shop.address_city = shop_seed.address_city
        shop.address_state = shop_seed.address_state
        shop.address_pincode = shop_seed.address_pincode
        shop.latitude = shop_seed.latitude
        shop.longitude = shop_seed.longitude
        shop.delivery_fee = shop_seed.delivery_fee
    await session.flush()
    return shop.id


async def upsert_products(
    session: AsyncSession,
    shop_id: UUID,
    products: tuple[ProductSeed, ...],
    category_ids: dict[str, UUID],
) -> int:
    product_names = [item.name for item in products]
    existing_products = (
        await session.execute(
            select(Product).where(Product.shop_id == shop_id, Product.name.in_(product_names))
        )
    ).scalars()
    product_by_name = {row.name: row for row in existing_products}

    for product_seed in products:
        product_row = product_by_name.get(product_seed.name)
        if product_row is None:
            product_row = Product(
                shop_id=shop_id,
                category_id=category_ids[product_seed.category_slug],
                name=product_seed.name,
                description=product_seed.description,
                price=product_seed.price,
                unit=product_seed.unit,
                image_url=product_seed.image_url,
                is_active=product_seed.is_active,
            )
            session.add(product_row)
            product_by_name[product_seed.name] = product_row
        else:
            product_row.category_id = category_ids[product_seed.category_slug]
            product_row.description = product_seed.description
            product_row.price = product_seed.price
            product_row.unit = product_seed.unit
            product_row.image_url = product_seed.image_url
            product_row.is_active = product_seed.is_active

    await session.flush()

    product_ids = [row.id for row in product_by_name.values()]
    existing_inventory = (
        await session.execute(select(Inventory).where(Inventory.product_id.in_(product_ids)))
    ).scalars()
    inventory_by_product_id = {row.product_id: row for row in existing_inventory}

    for product_seed in products:
        product_row = product_by_name[product_seed.name]
        inventory = inventory_by_product_id.get(product_row.id)
        if inventory is None:
            inventory = Inventory(product_id=product_row.id)
            session.add(inventory)

        inventory.quantity_available = product_seed.stock
        inventory.low_stock_threshold = product_seed.low_stock_threshold
    return len(products)


async def seed(session: AsyncSession) -> dict[str, str | int]:
    await session.execute(text("set statement_timeout = '30s'"))

    await upsert_customer(session)
    category_ids = await upsert_categories(session)

    product_count = 0
    shop_ids: list[str] = []
    for shop_seed in SHOPS:
        shop_id = await upsert_shop(session, shop_seed)
        product_count += await upsert_products(session, shop_id, shop_seed.products, category_ids)
        shop_ids.append(str(shop_id))

    await session.commit()
    return {
        'customer_user_id': CUSTOMER_ID_DEV,
        'customer_address_id': CUSTOMER_ADDRESS_ID_DEV,
        'shop_count': len(shop_ids),
        'product_count': product_count,
        'category_count': len(category_ids),
        'shop_ids': ','.join(shop_ids),
    }


async def main() -> None:
    factory = get_session_maker()
    async with factory() as session:
        result = await seed(session)
    print('Seed complete:', result)


if __name__ == '__main__':
    asyncio.run(main())
