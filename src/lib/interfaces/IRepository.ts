/**
 * Generic repository interface that defines standard CRUD operations
 * T represents the entity type
 * K represents the primary key type
 */
export interface IRepository<T, K> {
  /**
   * Find an entity by its primary key
   * @param id The primary key value
   */
  findById(id: K): Promise<T | null>;
  
  /**
   * Get all entities
   */
  findAll(): Promise<T[]>;
  
  /**
   * Create a new entity
   * @param entity The entity to create
   */
  create<I>(entity: I): Promise<T>;
  
  /**
   * Update an existing entity
   * @param id The primary key value
   * @param entity The entity with updated values
   */
  update<U>(id: K, entity: U): Promise<T | null>;
  
  /**
   * Delete an entity by its primary key
   * @param id The primary key value
   */
  delete(id: K): Promise<boolean>;
}