/**
 * Represents a user with permission to a location
 */
export interface LocationUser {
  /**
   * Unique identifier for the location owner entry
   */
  id: number;
  
  /**
   * User ID of the user
   */
  user_id: string;
  
  /**
   * Location ID this permission applies to
   */
  location_id: number;
  
  /**
   * Permission level (1: Admin, 2: User, 3: Viewer, 4: Disabled)
   */
  permission_level: number | null;
  
  /**
   * Whether the permission is active
   */
  is_active: boolean | null;
  
  /**
   * Description for this permission
   */
  description: string | null;
  
  /**
   * User profile information
   */
  profile?: {
    /**
     * User's full name
     */
    full_name: string | null;
    
    /**
     * User's email
     */
    email: string | null;
    
    /**
     * User's username
     */
    username: string | null;
  };
}

/**
 * Permission levels for locations and devices
 */
export enum PermissionLevel {
  /**
   * Full control over the location/device, including managing users
   */
  Admin = 1,
  
  /**
   * Can use and configure the location/device, but can't manage users
   */
  User = 2,
  
  /**
   * Can only view the location/device data
   */
  Viewer = 3,
  
  /**
   * No access to the location/device
   */
  Disabled = 4
}