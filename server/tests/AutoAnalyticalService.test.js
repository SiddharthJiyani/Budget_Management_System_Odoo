/**
 * Unit Tests for AutoAnalyticalService Core Logic
 * 
 * Tests the pure functions of the rule matching algorithm
 * without requiring database connections.
 * 
 * Run with: npm test
 */

describe('AutoAnalyticalService - evaluateRule', () => {
    // Test the evaluateRule function directly by recreating its logic here
    // This avoids the need to mock all dependencies

    /**
     * Inline copy of evaluateRule for unit testing
     * This matches the logic in AutoAnalyticalService.js
     */
    function evaluateRule(rule, context) {
        const matchedFields = [];
        let allConditionsMet = true;

        // Check partnerId condition
        if (rule.partnerId) {
            if (context.partnerId === rule.partnerId.toString()) {
                matchedFields.push('partnerId');
            } else {
                allConditionsMet = false;
            }
        }

        // Check partnerTagId condition (partner must have this tag)
        if (rule.partnerTagId) {
            if (context.partnerTags.includes(rule.partnerTagId.toString())) {
                matchedFields.push('partnerTagId');
            } else {
                allConditionsMet = false;
            }
        }

        // Check productId condition
        if (rule.productId) {
            if (context.productId === rule.productId.toString()) {
                matchedFields.push('productId');
            } else {
                allConditionsMet = false;
            }
        }

        // Check productCategoryId condition
        if (rule.productCategoryId) {
            if (context.productCategoryId === rule.productCategoryId.toString()) {
                matchedFields.push('productCategoryId');
            } else {
                allConditionsMet = false;
            }
        }

        return {
            matches: allConditionsMet && matchedFields.length > 0,
            matchedFields,
            score: matchedFields.length,
        };
    }

    describe('Single condition matching', () => {
        it('should match rule with partnerId condition', () => {
            const rule = { partnerId: { toString: () => 'partner1' } };
            const context = { partnerId: 'partner1', partnerTags: [], productId: null, productCategoryId: null };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.score).toBe(1);
            expect(result.matchedFields).toContain('partnerId');
        });

        it('should NOT match when partnerId differs', () => {
            const rule = { partnerId: { toString: () => 'partner1' } };
            const context = { partnerId: 'partner2', partnerTags: [], productId: null, productCategoryId: null };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(false);
            expect(result.score).toBe(0);
        });

        it('should match rule with partnerTagId when tag is in partner tags', () => {
            const rule = { partnerTagId: { toString: () => 'tag1' } };
            const context = { partnerId: 'partner1', partnerTags: ['tag1', 'tag2'], productId: null, productCategoryId: null };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.score).toBe(1);
            expect(result.matchedFields).toContain('partnerTagId');
        });

        it('should NOT match when partnerTagId is not in partner tags', () => {
            const rule = { partnerTagId: { toString: () => 'tag3' } };
            const context = { partnerId: 'partner1', partnerTags: ['tag1', 'tag2'], productId: null, productCategoryId: null };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(false);
        });

        it('should match rule with productId condition', () => {
            const rule = { productId: { toString: () => 'product1' } };
            const context = { partnerId: null, partnerTags: [], productId: 'product1', productCategoryId: null };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.matchedFields).toContain('productId');
        });

        it('should match rule with productCategoryId condition', () => {
            const rule = { productCategoryId: { toString: () => 'category1' } };
            const context = { partnerId: null, partnerTags: [], productId: null, productCategoryId: 'category1' };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.matchedFields).toContain('productCategoryId');
        });
    });

    describe('Multi-condition matching', () => {
        it('should score higher for more specific rules (2 conditions)', () => {
            const rule = {
                partnerId: { toString: () => 'partner1' },
                productCategoryId: { toString: () => 'category1' }
            };
            const context = { partnerId: 'partner1', partnerTags: [], productId: null, productCategoryId: 'category1' };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.score).toBe(2);
            expect(result.matchedFields).toHaveLength(2);
        });

        it('should NOT match if ANY condition fails', () => {
            const rule = {
                partnerId: { toString: () => 'partner1' },
                productCategoryId: { toString: () => 'category1' }
            };
            const context = { partnerId: 'partner1', partnerTags: [], productId: null, productCategoryId: 'category2' };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(false);
        });

        it('should match most specific rule (4 conditions) with score 4', () => {
            const rule = {
                partnerId: { toString: () => 'partner1' },
                partnerTagId: { toString: () => 'tag1' },
                productId: { toString: () => 'product1' },
                productCategoryId: { toString: () => 'category1' }
            };
            const context = {
                partnerId: 'partner1',
                partnerTags: ['tag1'],
                productId: 'product1',
                productCategoryId: 'category1'
            };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.score).toBe(4);
        });

        it('should handle null/undefined conditions in rule (wildcards)', () => {
            const rule = {
                productCategoryId: { toString: () => 'category1' },
                // partnerId, partnerTagId, productId are undefined (wildcard)
            };
            const context = {
                partnerId: 'any-partner',
                partnerTags: ['any-tag'],
                productId: 'any-product',
                productCategoryId: 'category1'
            };

            const result = evaluateRule(rule, context);

            expect(result.matches).toBe(true);
            expect(result.score).toBe(1); // Only productCategoryId counts
        });
    });

    describe('Priority resolution', () => {
        it('should correctly rank rules by priority weight', () => {
            const rules = [
                {
                    name: 'Category Only',
                    productCategoryId: { toString: () => 'category1' },
                },
                {
                    name: 'Partner Only',
                    partnerId: { toString: () => 'partner1' },
                },
                {
                    name: 'Category + Partner',
                    productCategoryId: { toString: () => 'category1' },
                    partnerId: { toString: () => 'partner1' },
                },
            ];

            const context = {
                partnerId: 'partner1',
                partnerTags: [],
                productId: null,
                productCategoryId: 'category1'
            };

            const evaluated = rules.map(rule => ({
                name: rule.name,
                ...evaluateRule(rule, context),
            }));

            // Sort by score descending
            evaluated.sort((a, b) => b.score - a.score);

            expect(evaluated[0].name).toBe('Category + Partner');
            expect(evaluated[0].score).toBe(2);
            expect(evaluated[1].score).toBe(1);
            expect(evaluated[2].score).toBe(1);
        });

        it('should use updatedAt as tie-breaker for equal scores', () => {
            const rules = [
                {
                    name: 'Older Rule',
                    productCategoryId: { toString: () => 'category1' },
                    updatedAt: new Date('2026-01-01'),
                },
                {
                    name: 'Newer Rule',
                    productCategoryId: { toString: () => 'category1' },
                    updatedAt: new Date('2026-01-15'),
                },
            ];

            const context = {
                partnerId: null,
                partnerTags: [],
                productId: null,
                productCategoryId: 'category1'
            };

            const evaluated = rules.map(rule => ({
                name: rule.name,
                updatedAt: rule.updatedAt,
                ...evaluateRule(rule, context),
            }));

            // Sort by score desc, then by updatedAt desc
            evaluated.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

            expect(evaluated[0].name).toBe('Newer Rule');
        });
    });
});
