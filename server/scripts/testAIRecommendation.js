/**
 * Test AI Recommendation System
 * 
 * This script tests the new AI-powered analytics recommendation layer.
 * 
 * Prerequisites:
 * 1. MongoDB running with seeded master data
 * 2. .env configured with AI_RECOMMENDATION_ENABLED=true
 * 3. GEMINI_API_KEY (or OPENAI_API_KEY or GROQ_API_KEY) set
 * 4. At least some historical purchase orders in the database
 * 
 * Usage:
 *   node server/scripts/testAIRecommendation.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Product = require('../models/Product');
const Category = require('../models/Category');
const AnalyticMaster = require('../models/AnalyticMaster');
const PurchaseOrder = require('../models/PurchaseOrder');
const { getAIRecommendationWithHistory } = require('../services/AIRecommendationService');
const { getHistoricalDataForAI, formatHistoricalDataForLLM, getStatisticalRecommendations } = require('../services/HistoricalDataService');

async function testAIRecommendation() {
    try {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║   AI-Powered Analytics Recommendation System Test          ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        // Connect to database
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to database\n');

        // Check configuration
        console.log('⚙️  Configuration Check:');
        console.log(`   AI Enabled: ${process.env.AI_RECOMMENDATION_ENABLED === 'true' ? '✅ Yes' : '❌ No'}`);
        console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'gemini (default)'}`);
        console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not set'}`);
        console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not set'}`);
        console.log(`   Groq API Key: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Not set'}`);
        console.log();

        // Get test data
        console.log('🔍 Finding test data...');
        const testVendor = await Contact.findOne().lean(); // Any contact can be used as vendor
        const testProduct = await Product.findOne().populate('category').lean();
        const analytics = await AnalyticMaster.find().lean(); // Get all analytics, regardless of status

        if (!testVendor || !testProduct || analytics.length === 0) {
            console.log('❌ Missing required test data!');
            console.log(`   Contacts found: ${testVendor ? '✅' : '❌'}`);
            console.log(`   Products found: ${testProduct ? '✅' : '❌'}`);
            console.log(`   Analytics found: ${analytics.length}`);
            console.log('\n   Run: node scripts/seedAITestData.js');
            return;
        }

        console.log(`   ✅ Vendor: ${testVendor.name}`);
        console.log(`   ✅ Product: ${testProduct.name}`);
        console.log(`   ✅ Category: ${testProduct.category?.name || 'N/A'}`);
        console.log(`   ✅ Available Analytics: ${analytics.length}`);
        console.log();

        // Check historical data
        console.log('📊 Checking historical data...');
        const historicalOrders = await PurchaseOrder.countDocuments({ status: { $in: ['confirmed', 'completed'] } });
        console.log(`   Purchase Orders: ${historicalOrders}`);
        
        if (historicalOrders === 0) {
            console.log('   ⚠️  Warning: No historical purchase orders found');
            console.log('   Recommendations will be based on general patterns only\n');
        } else {
            console.log('   ✅ Sufficient data for pattern analysis\n');
        }

        // Test 1: Historical Data Fetching
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 1: Historical Data Service');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const context = {
            partnerId: testVendor._id.toString(),
            partnerName: testVendor.name,
            productId: testProduct._id.toString(),
            productName: testProduct.name,
            productCategoryId: testProduct.category?._id?.toString(),
            productCategoryName: testProduct.category?.name,
        };

        console.log('Context:');
        console.log(`   Partner: ${context.partnerName}`);
        console.log(`   Product: ${context.productName}`);
        console.log(`   Category: ${context.productCategoryName}\n`);

        const historicalData = await getHistoricalDataForAI(context, 50);

        console.log('Historical Data Summary:');
        console.log(`   Total Records: ${historicalData.summary.totalHistoricalRecords}`);
        console.log(`   Partner History: ${historicalData.summary.partnerHistoryCount}`);
        console.log(`   Product History: ${historicalData.summary.productHistoryCount}`);
        console.log(`   Category History: ${historicalData.summary.categoryHistoryCount}`);
        console.log(`   Unique Analytics Used: ${historicalData.summary.uniqueAnalytics}`);
        console.log(`   Most Used: ${historicalData.summary.mostUsedAnalytics || 'N/A'}\n`);

        if (historicalData.analyticsUsagePatterns.length > 0) {
            console.log('Top Analytics Patterns:');
            historicalData.analyticsUsagePatterns.slice(0, 3).forEach((pattern, index) => {
                const autoPercent = ((pattern.autoAssignedCount / pattern.count) * 100).toFixed(0);
                console.log(`   ${index + 1}. ${pattern.analyticsName}`);
                console.log(`      Used ${pattern.count} times (${autoPercent}% auto-assigned)`);
            });
            console.log();
        }

        // Test 2: Statistical Recommendations (No AI)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 2: Statistical Recommendations (No AI)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const statRecommendations = getStatisticalRecommendations(historicalData, 3);

        if (statRecommendations.length > 0) {
            console.log('Statistical Recommendations:');
            statRecommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec.analyticsName}`);
                console.log(`      Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
                console.log(`      Reason: ${rec.reason}\n`);
            });
        } else {
            console.log('   No statistical recommendations (insufficient data)\n');
        }

        // Test 3: LLM-Formatted Prompt
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 3: Historical Data Formatting for LLM');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const formattedData = formatHistoricalDataForLLM(historicalData);
        console.log('Formatted Historical Context (first 500 chars):');
        console.log(formattedData.substring(0, 500) + '...\n');

        // Test 4: AI Recommendations (if enabled)
        if (process.env.AI_RECOMMENDATION_ENABLED === 'true') {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('TEST 4: AI-Powered Recommendations');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            console.log('Calling AI service... (this may take a few seconds)\n');

            const aiResult = await getAIRecommendationWithHistory({
                context,
                availableAnalytics: analytics,
                historicalLimit: 50,
                includeStatistical: true,
            });

            console.log('AI Analysis Results:');
            console.log(`   Provider: ${aiResult.provider || 'N/A'}`);
            console.log(`   Processing Time: ${aiResult.duration}ms`);
            console.log(`   AI Used: ${aiResult.used ? '✅ Yes' : '❌ No'}`);
            console.log(`   Error: ${aiResult.error || 'None'}\n`);

            if (aiResult.recommendations.length > 0) {
                console.log('🤖 AI Recommendations:');
                aiResult.recommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. ${rec.analyticsName}`);
                    console.log(`      Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
                    console.log(`      Reason: ${rec.reason}`);
                    console.log(`      Source: ${rec.source}\n`);
                });
            } else {
                console.log('   No AI recommendations generated');
                if (aiResult.error) {
                    console.log(`   Error: ${aiResult.error}\n`);
                }
            }

            if (aiResult.statisticalRecommendations.length > 0) {
                console.log('📊 Statistical Recommendations (fallback):');
                aiResult.statisticalRecommendations.forEach((rec, index) => {
                    console.log(`   ${index + 1}. ${rec.analyticsName}`);
                    console.log(`      Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
                    console.log(`      Reason: ${rec.reason}\n`);
                });
            }

        } else {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('TEST 4: AI-Powered Recommendations');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('⚠️  SKIPPED - AI_RECOMMENDATION_ENABLED is not set to "true"');
            console.log('   To enable AI recommendations:');
            console.log('   1. Set AI_RECOMMENDATION_ENABLED=true in .env');
            console.log('   2. Set GEMINI_API_KEY (or OPENAI_API_KEY or GROQ_API_KEY)');
            console.log('   3. Optionally set AI_PROVIDER (gemini/openai/groq)\n');
        }

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('✅ Test completed successfully!');
        console.log('\nKey Findings:');
        console.log(`   - Historical records analyzed: ${historicalData.summary.totalHistoricalRecords}`);
        console.log(`   - Statistical recommendations: ${statRecommendations.length}`);
        console.log(`   - AI enabled: ${process.env.AI_RECOMMENDATION_ENABLED === 'true' ? 'Yes' : 'No'}`);
        console.log('\nNext Steps:');
        console.log('   1. Create more purchase orders to build historical data');
        console.log('   2. Test the API endpoint: POST /api/auto-analytical/ai-recommend');
        console.log('   3. Integrate into frontend purchase order form');
        console.log('   4. Monitor AI accuracy and adjust confidence thresholds\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from database');
    }
}

// Run the test
testAIRecommendation();
