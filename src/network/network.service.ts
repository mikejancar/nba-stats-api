import { Injectable } from '@nestjs/common';
import aws from 'aws-sdk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

import { nbaStatsApi } from '../keys/aws.json';
import { DataSources } from '../models/data-sources.enum';

@Injectable()
export class NetworkService {
  private standardHeaders = {
    Host: 'stats.nba.com',
    Connection: 'keep-alive',
    Accept: 'application/json, text/plain, */*',
    'x-nba-stats-token': 'true',
    'X-NewRelic-ID': 'VQECWF5UChAHUlNTBwgBVw==',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
    'x-nba-stats-origin': 'stats',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  private bucket = 'nba-stat-data';

  get(url: string, useProxy = false): Promise<any> {
    const options = this.createOptions('GET', useProxy);
    console.log(`GET: ${url}`);
    return fetch(url, options).then(rawResponse => rawResponse.json());
  }

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

  async saveObjectToBucket(bucket: DataSources, key: string, data: any): Promise<void> {
    const s3 = new aws.S3({ accessKeyId: nbaStatsApi.id, secretAccessKey: nbaStatsApi.key });
    const params = { Body: data, Bucket: this.bucket, Key: `${bucket}/${bucket}-${key}.json` };
    console.log(`Saving bucket object: ${params.Key}`);
    try {
      await s3.putObject(params).promise();
    } catch (error) {
      console.error(`Error saving ${key}`, error);
      throw error;
    }
  }

  private createOptions(method: string, useProxy: boolean): any {
    let agent = null;
    if (useProxy) {
      agent = new HttpsProxyAgent('https://136.244.86.162:8080');
    }
    return { method, headers: this.standardHeaders, agent };
  }
}
