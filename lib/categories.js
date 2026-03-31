// Fixed Blog Categories System
// Only these 7 categories are allowed

export const BLOG_CATEGORIES = {
    LITERATURE: 'Literature',
    TECHNOLOGY: 'Technology',
    THOUGHTS: 'Thoughts / Opinion',
    ARTICLE: 'Article',
    GENERAL: 'General',
    POLITICS: 'Politics',
    PHILOSOPHY: 'Philosophy'
};

export const CATEGORY_SLUGS = {
    'Literature': 'literature',
    'Information and Study': 'study',
    'Technology': 'technology',
    'Thoughts / Opinion': 'thoughts',
    'Article': 'article',
    'General': 'general',
    'Politics': 'politics',
    'Philosophy': 'philosophy'
};

export const CATEGORY_LAYOUTS = {
    'Literature': 'literature',
    'Information and Study': 'study',
    'Technology': 'technology',
    'Thoughts / Opinion': 'thoughts',
    'Article': 'article',
    'General': 'general',
    'Politics': 'politics',
    'Philosophy': 'philosophy'
};

// Literature-specific fields
export const LITERATURE_TYPES = [
    'Poem',
    'Book Study',
    'Essay',
    'Story'
];

// Validate category
export function isValidCategory(category) {
    return Object.values(BLOG_CATEGORIES).includes(category);
}

// Get category slug
export function getCategorySlug(category) {
    return CATEGORY_SLUGS[category] || 'general';
}

// Get category layout
export function getCategoryLayout(category) {
    return CATEGORY_LAYOUTS[category] || 'general';
}
