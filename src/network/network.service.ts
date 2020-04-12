import { Injectable } from '@nestjs/common';
import aws from 'aws-sdk';

import { nbaStatsApi } from '../keys/aws.json';
import { DataSources } from '../models';

@Injectable()
export class NetworkService {
  private bucket = 'nba-stat-data';

  async getObjectFromBucket(bucket: DataSources, key: string): Promise<any> {
    const s3 = new aws.S3({ accessKeyId: nbaStatsApi.id, secretAccessKey: nbaStatsApi.key });
    const params = { Bucket: this.bucket, Key: `${bucket}/${bucket}-${key}.json` };
    console.log(`Getting bucket object: ${params.Key}`);
    return await s3.getObject(params).promise();
  }

  async getNewestBucketObjectDate(bucket: DataSources): Promise<string> {
    const s3 = new aws.S3({ accessKeyId: nbaStatsApi.id, secretAccessKey: nbaStatsApi.key });
    const params = { Bucket: this.bucket, Prefix: bucket };
    console.log(`Getting newest bucket object...`);
    const bucketObjects = await s3.listObjectsV2(params).promise();
    return Promise.resolve(
      bucketObjects.Contents.slice(1)
        .map(content => content.Key.replace(`${bucket}/`, ''))
        .sort((fileOne, fileTwo) => fileTwo.localeCompare(fileOne))[0]
        .replace(`${bucket}-`, '')
        .replace('.json', '')
        .replace(/-/g, '')
    );
  }
}
