import test from 'node:test';
import assert from 'node:assert/strict';
import {leadershipPodcastPoints} from './founder-footprint';
const now=Date.parse('2026-11-13T00:00:00Z');
const show={url:'https://person.example/podcast',readable:true,verified:true,linkedFromWebsite:false,episodes:0,latestEpisode:null,note:'Associated evidence'};
test('leadership podcasts reuse bounded existing criteria and unverified evidence earns no points',()=>{
 assert.equal(leadershipPodcastPoints(show,now),.9);
 assert.equal(leadershipPodcastPoints({...show,verified:false},now),0);
 assert.equal(leadershipPodcastPoints({...show,episodes:12,latestEpisode:'2026-11-01'},now),1.5);
 assert.equal(leadershipPodcastPoints({...show,episodes:12,latestEpisode:'2024-11-01'},now),.45);
 assert.equal(leadershipPodcastPoints({...show,episodes:12,latestEpisode:'2030-11-01'},now),1.2);
});
