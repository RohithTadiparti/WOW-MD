import { describe, expect, it } from 'vitest';
import { filterPlannerWeddings } from './planner-weddings';

describe('filterPlannerWeddings', () => {
  const weddings = [
    { name: 'Maya & Rahul', status: 'upcoming', weddingDate: '2026-11-01', location: 'Delhi' },
    { name: 'Riya & Arjun', status: 'active', weddingDate: '2026-09-20', location: 'Mumbai' },
    { name: 'Nisha & Karan', status: 'completed', weddingDate: '2026-06-10', location: 'Bengaluru' },
  ];

  it('filters by planner wedding lifecycle tab', () => {
    // Planning is the umbrella queue: work that is upcoming and work already
    // underway. The separate In Progress tab narrows it to active weddings.
    expect(filterPlannerWeddings(weddings, 'planning')).toHaveLength(2);
    expect(filterPlannerWeddings(weddings, 'upcoming')).toHaveLength(1);
    expect(filterPlannerWeddings(weddings, 'in_progress')).toHaveLength(1);
    expect(filterPlannerWeddings(weddings, 'completed')).toHaveLength(1);
  });

  it('matches text on name or city', () => {
    expect(filterPlannerWeddings(weddings, 'all', 'mumbai')).toHaveLength(1);
    expect(filterPlannerWeddings(weddings, 'all', 'rahul')).toHaveLength(1);
  });
});
