import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ReviewsView from '../components/ReviewsView.jsx';

describe('Day 5 Frontend Task 2: Verified Customer Reviews (sec-reviews)', () => {
  const samplePendingItem = {
    order_item_id: 'oi-test-101',
    order_id: 'ord-test-delivered-101',
    order_number: 'ORD-9821',
    listing_id: 'listing-prod-202',
    product_name: 'Organic Basmati Rice 5kg',
    unit_price: 499,
    quantity: 1,
    store_name: 'Shabbir Supermarket',
    order_date: '2026-10-12T10:00:00.000Z'
  };

  const sampleSubmittedReview = {
    id: 'rev-test-303',
    listing_id: 'listing-prod-202',
    product_name: 'Organic Basmati Rice 5kg',
    store_name: 'Shabbir Supermarket',
    order_number: 'ORD-9821',
    rating: 5,
    title: 'Aromatic and top quality grains!',
    comment: 'Cooks very fluffy and has genuine authentic basmati fragrance. Arrived fast and well-sealed.',
    created_at: '2026-10-13T12:00:00.000Z',
    media: [
      { id: 'med-1', media_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500' }
    ],
    replies: [
      {
        id: 'rep-1',
        store_name: 'Shabbir Supermarket',
        reply_text: 'Thank you for your generous feedback! We take pride in sourcing pure aromatic Basmati.',
        created_at: '2026-10-13T14:30:00.000Z'
      }
    ]
  };

  it('1. Renders container section #sec-reviews with header and Verified Purchases badge', () => {
    const html = renderToString(
      <ReviewsView onBack={() => {}} />
    );

    expect(html).toContain('id="sec-reviews"');
    expect(html).toContain('Verified Customer Reviews');
    expect(html).toContain('Verified Purchases');
  });

  it('2. Renders Pending Reviews and My Reviews tabs with accurate counters', () => {
    const html = renderToString(
      <ReviewsView
        onBack={() => {}}
        initialPending={[samplePendingItem]}
        initialReviews={[sampleSubmittedReview]}
      />
    );

    expect(html).toContain('Pending Reviews');
    expect(html).toContain('My Reviews');
    expect(html).toContain('1'); // badge count
  });

  it('3. Renders Delivered Order Review Prompt ("Rate order #...") card with 1-5 star selectors', () => {
    const html = renderToString(
      <ReviewsView
        onBack={() => {}}
        initialTab="pending"
        initialPending={[samplePendingItem]}
      />
    );

    // Order prompt card
    expect(html).toContain('Rate order #ORD-9821');
    expect(html).toContain('Delivered Order');
    expect(html).toContain('Organic Basmati Rice 5kg');
    expect(html).toContain('Shabbir Supermarket');
    expect(html).toContain('Write Review');
    expect(html).toContain('Rate:');
  });

  it('4. Renders Review Submission Form modal with 1-5 star selector, title, comment, and photo preview', () => {
    const html = renderToString(
      <ReviewsView
        onBack={() => {}}
        preselectedPendingItem={samplePendingItem}
      />
    );

    // Modal title & verified purchase note
    expect(html).toContain('Write a Verified Review');
    expect(html).toContain('Only verified purchasers can submit reviews');
    // Product header inside modal
    expect(html).toContain('Organic Basmati Rice 5kg');
    // Form fields
    expect(html).toContain('Overall Rating');
    expect(html).toContain('Headline / Summary');
    expect(html).toContain('Detailed Review');
    expect(html).toContain('Add Photos &amp; Unboxing Evidence');
    // Action button
    expect(html).toContain('Submit Verified Review');
  });

  it('5. Renders My Reviews tab with Verified Purchase badge, star rating, media gallery, and Seller Replies', () => {
    const html = renderToString(
      <ReviewsView
        onBack={() => {}}
        initialTab="submitted"
        initialReviews={[sampleSubmittedReview]}
      />
    );

    // Review content
    expect(html).toContain('Organic Basmati Rice 5kg');
    expect(html).toContain('✓ Verified Purchase');
    expect(html).toContain('5.0 / 5.0');
    expect(html).toContain('Aromatic and top quality grains!');
    expect(html).toContain('Cooks very fluffy and has genuine authentic basmati fragrance.');
    // Media gallery
    expect(html).toContain('Attached Photos &amp; Evidence');
    // Store reply
    expect(html).toContain('Store Response from Shabbir Supermarket');
    expect(html).toContain('Thank you for your generous feedback!');
    // Edit action
    expect(html).toContain('Edit Review');
  });

  it('6. Renders friendly empty states when pending queue or submitted list is empty', () => {
    const emptyPendingHtml = renderToString(
      <ReviewsView
        onBack={() => {}}
        initialTab="pending"
        initialPending={[]}
      />
    );
    expect(emptyPendingHtml).toContain('All Caught Up!');
    expect(emptyPendingHtml).toContain('You have reviewed all your delivered purchases');

    const emptySubmittedHtml = renderToString(
      <ReviewsView
        onBack={() => {}}
        initialTab="submitted"
        initialReviews={[]}
      />
    );
    expect(emptySubmittedHtml).toContain('No Reviews Submitted Yet');
  });
});
