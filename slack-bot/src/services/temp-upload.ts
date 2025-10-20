import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { getDbPool } from '../database';
import { config } from '../config';

export type UploadType = 'cv' | 'project' | 'vacancy';

export interface TempUploadLink {
  id: string;
  uploadUrl: string;
  expiresAt: Date;
  uploadType: UploadType;
}

export class TempUploadService {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      config.azure.storageConnectionString
    );
  }

  /**
   * Generate a temporary upload link with SAS token
   */
  async generateUploadLink(
    slackUserId: string,
    uploadType: UploadType,
    targetUserId?: number
  ): Promise<TempUploadLink> {
    const linkId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in database
    const pool = await getDbPool();
    await pool
      .request()
      .input('id', sql.NVarChar(50), linkId)
      .input('slackUserId', sql.NVarChar(50), slackUserId)
      .input('uploadType', sql.NVarChar(20), uploadType)
      .input('targetUserId', sql.Int, targetUserId || null)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO TempUploadLinks (Id, SlackUserId, UploadType, TargetUserId, ExpiresAt)
        VALUES (@id, @slackUserId, @uploadType, @targetUserId, @expiresAt)
      `);

    // Generate SAS URL for direct upload
    const containerName = this.getContainerName(uploadType);
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const blobName = `temp-${linkId}`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    // Extract account name and key from connection string
    const { accountName, accountKey } = this.parseConnectionString(
      config.azure.storageConnectionString
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('w'), // Write only
        expiresOn: expiresAt,
      },
      new StorageSharedKeyCredential(accountName, accountKey)
    ).toString();

    const uploadUrl = `${blobClient.url}?${sasToken}`;

    return {
      id: linkId,
      uploadUrl,
      expiresAt,
      uploadType,
    };
  }

  /**
   * Validate and retrieve upload link metadata
   */
  async validateUploadLink(linkId: string): Promise<{
    valid: boolean;
    slackUserId?: string;
    uploadType?: UploadType;
    targetUserId?: number;
  }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('id', sql.NVarChar(50), linkId)
      .query(`
        SELECT SlackUserId, UploadType, TargetUserId, ExpiresAt, UsedAt
        FROM TempUploadLinks
        WHERE Id = @id
      `);

    if (result.recordset.length === 0) {
      return { valid: false };
    }

    const link = result.recordset[0];

    // Check if expired
    if (new Date() > new Date(link.ExpiresAt)) {
      return { valid: false };
    }

    // Check if already used
    if (link.UsedAt) {
      return { valid: false };
    }

    return {
      valid: true,
      slackUserId: link.SlackUserId,
      uploadType: link.UploadType,
      targetUserId: link.TargetUserId,
    };
  }

  /**
   * Mark upload link as used
   */
  async markAsUsed(linkId: string): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('id', sql.NVarChar(50), linkId)
      .query(`
        UPDATE TempUploadLinks
        SET UsedAt = GETDATE()
        WHERE Id = @id
      `);
  }

  /**
   * Clean up expired upload links
   */
  async cleanupExpiredLinks(): Promise<number> {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      DELETE FROM TempUploadLinks
      WHERE ExpiresAt < GETDATE() AND UsedAt IS NULL
    `);

    return result.rowsAffected[0] || 0;
  }

  private getContainerName(uploadType: UploadType): string {
    switch (uploadType) {
      case 'cv':
        return 'cv-files';
      case 'project':
        return 'project-files';
      case 'vacancy':
        return 'vacancy-files';
      default:
        throw new Error(`Unknown upload type: ${uploadType}`);
    }
  }

  private parseConnectionString(connectionString: string): {
    accountName: string;
    accountKey: string;
  } {
    const parts = connectionString.split(';');
    let accountName = '';
    let accountKey = '';

    for (const part of parts) {
      if (part.startsWith('AccountName=')) {
        accountName = part.substring('AccountName='.length);
      } else if (part.startsWith('AccountKey=')) {
        accountKey = part.substring('AccountKey='.length);
      }
    }

    if (!accountName || !accountKey) {
      throw new Error('Invalid Azure Storage connection string');
    }

    return { accountName, accountKey };
  }
}

export const tempUploadService = new TempUploadService();

