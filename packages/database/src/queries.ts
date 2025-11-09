import type { SupabaseClient } from './client';
import type { Event, Chore, List, ListItem } from './types';

// Event Queries
export async function getEvents(
  client: SupabaseClient,
  familyId: string,
  startDate: Date,
  endDate: Date
) {
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('family_id', familyId)
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data as Event[];
}

export async function createEvent(client: SupabaseClient, event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await client
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(
  client: SupabaseClient,
  id: string,
  updates: Partial<Omit<Event, 'id' | 'created_at'>>
) {
  const { data, error } = await client
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(client: SupabaseClient, id: string) {
  const { error } = await client.from('events').delete().eq('id', id);
  if (error) throw error;
}

// Chore Queries
export async function getChores(client: SupabaseClient, familyId: string) {
  const { data, error } = await client
    .from('chores')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Chore[];
}

export async function completeChore(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('chores')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Chore;
}

// List Queries
export async function getLists(client: SupabaseClient, familyId: string) {
  const { data, error } = await client
    .from('lists')
    .select('*, list_items(*)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addListItem(
  client: SupabaseClient,
  item: Omit<ListItem, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await client
    .from('list_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as ListItem;
}

export async function toggleListItem(client: SupabaseClient, id: string, checked: boolean) {
  const { data, error } = await client
    .from('list_items')
    .update({ checked })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ListItem;
}
