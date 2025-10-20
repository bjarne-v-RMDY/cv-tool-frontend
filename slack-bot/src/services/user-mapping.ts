import sql from 'mssql';
import { getDbPool } from '../database';

export interface SlackUser {
  id: number;
  slackUserId: string;
  slackEmail: string | null;
  cvToolUserId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CVToolUser {
  Id: number;
  Name: string;
  Email: string | null;
}

export class UserMappingService {
  /**
   * Get CV Tool user ID from Slack user ID
   */
  async getCVToolUserId(slackUserId: string): Promise<number | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('slackUserId', sql.NVarChar(50), slackUserId)
      .query(
        'SELECT CVToolUserId FROM SlackUsers WHERE SlackUserId = @slackUserId'
      );

    if (result.recordset.length > 0) {
      return result.recordset[0].CVToolUserId;
    }

    return null;
  }

  /**
   * Auto-map Slack user by email
   */
  async autoMapByEmail(
    slackUserId: string,
    slackEmail: string
  ): Promise<number | null> {
    const pool = await getDbPool();

    // Find CV Tool user by email
    const userResult = await pool
      .request()
      .input('email', sql.NVarChar(100), slackEmail)
      .query('SELECT Id FROM Users WHERE Email = @email');

    if (userResult.recordset.length === 0) {
      return null;
    }

    const cvToolUserId = userResult.recordset[0].Id;

    // Create mapping
    await pool
      .request()
      .input('slackUserId', sql.NVarChar(50), slackUserId)
      .input('slackEmail', sql.NVarChar(100), slackEmail)
      .input('cvToolUserId', sql.Int, cvToolUserId)
      .query(`
        INSERT INTO SlackUsers (SlackUserId, SlackEmail, CVToolUserId)
        VALUES (@slackUserId, @slackEmail, @cvToolUserId)
      `);

    console.log(
      `✅ Auto-mapped Slack user ${slackUserId} to CV Tool user ${cvToolUserId}`
    );
    return cvToolUserId;
  }

  /**
   * Manually link Slack user to CV Tool user (admin command)
   */
  async manualLink(
    slackUserId: string,
    slackEmail: string | null,
    cvToolUserId: number
  ): Promise<void> {
    const pool = await getDbPool();

    // Check if CV Tool user exists
    const userResult = await pool
      .request()
      .input('userId', sql.Int, cvToolUserId)
      .query('SELECT Id FROM Users WHERE Id = @userId');

    if (userResult.recordset.length === 0) {
      throw new Error(`CV Tool user with ID ${cvToolUserId} not found`);
    }

    // Check if mapping already exists
    const existingMapping = await pool
      .request()
      .input('slackUserId', sql.NVarChar(50), slackUserId)
      .query('SELECT Id FROM SlackUsers WHERE SlackUserId = @slackUserId');

    if (existingMapping.recordset.length > 0) {
      // Update existing mapping
      await pool
        .request()
        .input('slackUserId', sql.NVarChar(50), slackUserId)
        .input('slackEmail', sql.NVarChar(100), slackEmail)
        .input('cvToolUserId', sql.Int, cvToolUserId)
        .query(`
          UPDATE SlackUsers 
          SET CVToolUserId = @cvToolUserId, 
              SlackEmail = @slackEmail,
              UpdatedAt = GETDATE()
          WHERE SlackUserId = @slackUserId
        `);
    } else {
      // Create new mapping
      await pool
        .request()
        .input('slackUserId', sql.NVarChar(50), slackUserId)
        .input('slackEmail', sql.NVarChar(100), slackEmail)
        .input('cvToolUserId', sql.Int, cvToolUserId)
        .query(`
          INSERT INTO SlackUsers (SlackUserId, SlackEmail, CVToolUserId)
          VALUES (@slackUserId, @slackEmail, @cvToolUserId)
        `);
    }

    console.log(
      `✅ Manually linked Slack user ${slackUserId} to CV Tool user ${cvToolUserId}`
    );
  }

  /**
   * Get all CV Tool users for dropdown selection
   */
  async getAllCVToolUsers(): Promise<CVToolUser[]> {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT Id, Name, Email 
      FROM Users 
      ORDER BY Name
    `);

    return result.recordset;
  }

  /**
   * Get CV Tool user details
   */
  async getCVToolUser(userId: number): Promise<CVToolUser | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query('SELECT Id, Name, Email FROM Users WHERE Id = @userId');

    if (result.recordset.length > 0) {
      return result.recordset[0];
    }

    return null;
  }

  /**
   * Get or create user mapping with auto-mapping attempt
   */
  async getOrCreateMapping(
    slackUserId: string,
    slackEmail: string | null
  ): Promise<number | null> {
    // Try to get existing mapping
    let cvToolUserId = await this.getCVToolUserId(slackUserId);
    if (cvToolUserId) {
      return cvToolUserId;
    }

    // Try auto-mapping by email
    if (slackEmail) {
      cvToolUserId = await this.autoMapByEmail(slackUserId, slackEmail);
      if (cvToolUserId) {
        return cvToolUserId;
      }
    }

    // No mapping found
    return null;
  }
}

export const userMappingService = new UserMappingService();

