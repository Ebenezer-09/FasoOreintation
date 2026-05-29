/**
 * routes/scholarships.js
 * Route Express qui expose les bourses depuis Supabase
 */

const express = require('express');
const router = express.Router();
const { initSupabase } = require('../supabase-client');

// GET /api/scholarships — liste toutes les bourses (triées par deadline)
router.get('/', async (req, res) => {
    try {
        const sb = initSupabase();
        const { search, niveau, pays, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = sb
            .from('scholarships')
            .select('*', { count: 'exact' })
            .order('application_deadline', { ascending: true, nullsFirst: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        if (niveau) {
            const nivStr = niveau.toLowerCase();
            if (nivStr === 'bachelor' || nivStr === 'licence') {
                query = query.in('eligibility_criteria', ['Bachelor', 'Undergraduate', 'Licence']);
            } else if (nivStr === 'master') {
                query = query.in('eligibility_criteria', ['Master', 'Graduate', 'Postgraduate']);
            } else if (nivStr === 'phd' || nivStr === 'doctorat') {
                query = query.in('eligibility_criteria', ['PhD', 'Doctorate', 'Doctoral', 'Doctorat']);
            } else {
                query = query.ilike('eligibility_criteria', `%${niveau}%`);
            }
        }
        if (pays) {
            query = query.contains('target_countries', [pays]);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ success: true, data, total: count, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error('Scholarships API error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
