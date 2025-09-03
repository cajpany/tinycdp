export interface User {
  id: string;
  created_at: Date;
}

export interface UserAlias {
  user_id: string;
  kind: 'deviceId' | 'externalId' | 'emailHash';
  value: string;
}

export interface Event {
  id: number;
  user_id: string;
  ts: Date;
  name: string;
  props?: Record<string, unknown>;
}

export interface TraitDef {
  id: string;
  key: string;
  expression: string;
  updated_at: Date;
}

export interface SegmentDef {
  id: string;
  key: string;
  rule: string;
  updated_at: Date;
}

export interface Flag {
  key: string;
  rule: string;
}

export interface UserTrait {
  user_id: string;
  key: string;
  value: unknown;
  updated_at: Date;
}

export interface UserSegment {
  user_id: string;
  key: string;
  in_segment: boolean;
  since?: Date;
  updated_at: Date;
}

export interface APIKey {
  id: string;
  kind: 'write' | 'read' | 'admin';
  key_hash: string;
  created_at: Date;
}
