# frozen_string_literal: true

require_relative '../discourse_automation_helper'

describe Jobs::StalledTopicTracker do
  before do
    SiteSetting.discourse_automation_enabled = true
  end

  fab!(:automation) {
    Fabricate(
      :automation,
      trigger: DiscourseAutomation::Triggerable::STALLED_TOPIC
    )
  }

  context 'find stalled topics' do
    fab!(:user_1) { Fabricate(:user) }
    fab!(:topic_1) { Fabricate(:topic, user: user_1, created_at: 1.month.ago) }

    before do
      automation.upsert_field!('stalled_after', 'choices', { value: 'PT1H' }, target: 'trigger')
    end

    it 'triggers the associated automation' do
      create_post(topic: topic_1, user: user_1, created_at: 1.month.ago)
      create_post(topic: topic_1, user: user_1, created_at: 1.month.ago)

      list = capture_contexts do
        Jobs::StalledTopicTracker.new.execute
      end

      expect(list.length).to eq(1)

      expect(list.first['kind']).to eq(DiscourseAutomation::Triggerable::STALLED_TOPIC)
      expect(list.first['topic']['id']).to eq(topic_1.id)
    end
  end
end
